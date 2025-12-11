// LocationMap.js
import React, { useEffect, useState, useRef } from "react";
import "./LocationMap.css";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { db } from "../firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
// Import your ORS key from a central config file (create src/config/keys.js that exports ORS_API_KEY)
import { ORS_API_KEY } from "../config/keys";

/* Fix default marker icons for Leaflet */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

/* ---------- Helper Components ---------- */

// CenteredModal now uses inline styles to ensure it sits above everything reliably.
function CenteredModal({ show, onClose, children, title }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        zIndex: 9999,
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(400px, 96%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 10,
          padding: 20,
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          position: "relative",
        }}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            border: "none",
            background: "#1976d2",
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ×
        </button>
        {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "";
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return "Now";
  if (diffSec < 60) return `${diffSec} second${diffSec !== 1 ? "s" : ""} ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

const getBadgeStyle = (level) => {
  switch ((level || "").toLowerCase()) {
    case "high-risk emergency":
      return { backgroundColor: "#e53935", color: "#fff", padding: "4px 8px", borderRadius: 6 };
    case "risk emergency":
      return { backgroundColor: "#fb8c00", color: "#fff", padding: "4px 8px", borderRadius: 6 };
    case "normal emergency":
      return { backgroundColor: "#42a5f5", color: "#fff", padding: "4px 8px", borderRadius: 6 };
    default:
      return { backgroundColor: "#9e9e9e", color: "#fff", padding: "4px 8px", borderRadius: 6 };
  }
};

/* ---------- LocationTracker (geolocation watch) ---------- */
function LocationTracker({ setCurrentLocation }) {
  const map = useMap();
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latlng = [position.coords.latitude, position.coords.longitude];
        setCurrentLocation(latlng);
        // don't auto-center to avoid disrupting user view
      },
      (err) => console.warn("Location error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, setCurrentLocation]);
  return null;
}

/* ---------- Main Component ---------- */
export default function LocationMap() {
  const [locations, setLocations] = useState({}); // keyed by id
  const [currentLocation, setCurrentLocation] = useState(null);
  const [waveRadius, setWaveRadius] = useState(50);
  const [, forceUpdate] = useState({});
  const [modalPatient, setModalPatient] = useState(null);
  const [laborStatus, setLaborStatus] = useState(null);

  const [routePoints, setRoutePoints] = useState([]); // array of [lat, lng]
  const [mapRef, setMapRef] = useState(null);

  // computed big circle (auto)
  const [bigCircle, setBigCircle] = useState(null); // { center: [lat,lng], radius: meters }

  // hover/pagination state
  const [hoveredId, setHoveredId] = useState(null);
  const markersRef = useRef({}); // map of id -> marker instance
  const rowsPerPage = 5;
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState("All");

  // Emergency modal state
  const [emergencyModal, setEmergencyModal] = useState(null);

  // Refresh timestamps (every 30s re-render to update "time ago")
  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 30000);
    return () => clearInterval(interval);
  }, []);

  // wave circle animation
  useEffect(() => {
    const interval = setInterval(
      () => setWaveRadius((r) => (r >= 300 ? 50 : r + 10)),
      200
    );
    return () => clearInterval(interval);
  }, []);

  // Fetch pregnant locations and related user/status documents
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pregnant_locations"), (snap) => {
      snap.docs.forEach(async (docSnap) => {
        const loc = docSnap.data();
        // timestamp conversion fix: call toMillis if available
        const timestamp = loc.timestamp?.toMillis ? loc.timestamp.toMillis() : loc.timestamp;

        // emergency level from pregnant_status
        let emergencyLevel = "Unknown";
        try {
          const statusDoc = await getDoc(doc(db, "pregnant_status", docSnap.id));
          if (statusDoc.exists()) emergencyLevel = statusDoc.data()?.emergencyLevel || "Unknown";
        } catch (e) {
          console.warn("status fetch error", e);
        }

        // name and phone from pregnant_users
        let name = "Unnamed";
        let phone = "";
        let locationName = loc.location || "Unknown location";
        try {
          const userDoc = await getDoc(doc(db, "pregnant_users", docSnap.id));
          if (userDoc.exists()) {
            name = userDoc.data()?.name || name;
            phone = userDoc.data()?.phone || phone;
          }
        } catch (e) {
          console.warn("user fetch error", e);
        }

        // update single record
        setLocations((prev) => (({
          ...prev,
          [docSnap.id]: {
            id: docSnap.id,
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
            timestamp,
            name,
            phone,
            emergencyLevel,
            location: locationName,
          },
        })));
      });
    });

    return () => unsub();
  }, []);

  // compute lists
  const now = Date.now();
  const emergencyList = [];
  const recentList = [];

  Object.values(locations).forEach((p) => {
    if (p.latitude && p.longitude && p.timestamp) {
      const minutesAgo = (now - p.timestamp) / 60000;
      if (minutesAgo <= 5) emergencyList.push(p);
      else {
        // month filter
        if (selectedMonth === "All") recentList.push(p);
        else {
          const dateObj = new Date(p.timestamp);
          if (dateObj.toLocaleString("default", { month: "long" }) === selectedMonth) {
            recentList.push(p);
          }
        }
      }
    }
  });

  // Auto-open emergency modal when locations change (show latest emergency)
  useEffect(() => {
    // compute emergencyList on locations change (we already computed above each render)
    // To ensure the effect reacts to changes, we create a small array of emergency ids:
    const emergencyIds = Object.values(locations)
      .filter((p) => {
        if (!p || !p.timestamp || !p.latitude || !p.longitude) return false;
        const minutesAgo = (Date.now() - p.timestamp) / 60000;
        return minutesAgo <= 5;
      })
      .map((p) => p.id)
      .sort(); // deterministic

    if (emergencyIds.length > 0) {
      // pick the first emergency id (or you could choose most recent by timestamp)
      const firstId = emergencyIds[0];
      const first = locations[firstId];
      if (first) {
        setEmergencyModal(first);
      }
    } else {
      setEmergencyModal(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(locations)]); // watch locations object changes (stringified for shallow check)

  // Pagination slice
  const startIndex = pageIndex * rowsPerPage;
  const paginatedList = recentList.slice(startIndex, startIndex + rowsPerPage);
  const pageCount = Math.max(1, Math.ceil(recentList.length / rowsPerPage));

  // compute big circle automatically whenever locations change
  useEffect(() => {
    const points = Object.values(locations)
      .filter((p) => p.latitude && p.longitude)
      .map((p) => L.latLng(p.latitude, p.longitude));

    if (points.length === 0) {
      setBigCircle(null);
      return;
    }

    const bounds = L.latLngBounds(points);
    const center = bounds.getCenter();
    // compute max distance from center (meters)
    let maxDist = 0;
    points.forEach((pt) => {
      const dist = center.distanceTo(pt); // meters
      if (dist > maxDist) maxDist = dist;
    });
    // add 10% padding
    const radius = Math.max(50, maxDist * 1.1);

    setBigCircle({ center: [center.lat, center.lng], radius });
    // optionally fit map to big circle bounds
    if (mapRef && points.length > 0) {
      try {
        const circleBounds = L.circle([center.lat, center.lng], { radius }).getBounds();
        mapRef.fitBounds(circleBounds, { padding: [40, 40] });
      } catch (e) {
        // ignore if map not ready
      }
    }
  }, [locations, mapRef]);

  // view labor status
  const handleViewLaborStatus = async (patientId) => {
    try {
      const statusDoc = await getDoc(doc(db, "pregnant_status", patientId));
      if (statusDoc.exists()) {
        setLaborStatus({ id: patientId, ...statusDoc.data() });
      } else {
        setLaborStatus({ id: patientId, message: "No labor status found." });
      }
    } catch (err) {
      console.warn("labor status error", err);
    }
  };

  // locate pregnant (route drawing) uses modalPatient & currentLocation
  const handleLocatePregnant = async (patient) => {
    // Ensure we have numeric positions
    if (!currentLocation) {
      alert("Your location is not available. Please allow location access.");
      return;
    }
    if (!patient || patient.latitude == null || patient.longitude == null) {
      alert("Patient location not available.");
      return;
    }

    // Build latlng arrays as [lat, lng] numbers (Leaflet / react-leaflet uses [lat, lng])
    const userPos = [Number(currentLocation[0]), Number(currentLocation[1])];
    const pregPos = [Number(patient.latitude), Number(patient.longitude)];

    // Attempt to get a street-following route from OpenRouteService Directions API
    try {
      if (!ORS_API_KEY) throw new Error("ORS_API_KEY is not set. Put it in src/config/keys.js and export ORS_API_KEY.");

      // ORS expects start=lng,lat and returns coordinates as [lng, lat]
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${userPos[1]},${userPos[0]}&end=${pregPos[1]},${pregPos[0]}`;

      const res = await axios.get(url, { timeout: 15000 });
      const coords = res.data?.features?.[0]?.geometry?.coordinates || [];

      if (!coords.length) {
        throw new Error("No route returned from ORS.");
      }

      // Convert [lng, lat] to [lat, lng] pairs for Leaflet
      const routeLatLngs = coords.map((c) => [c[1], c[0]]);

      setRoutePoints(routeLatLngs);

      // fit map bounds to route
      if (mapRef && routeLatLngs.length > 0) {
        try {
          const bounds = L.latLngBounds(routeLatLngs);
          if (typeof mapRef.fitBounds === "function") {
            // react-leaflet Map instance fits bounds this way
            mapRef.fitBounds(bounds.pad(0.2), { padding: [50, 50] });
          } else if (mapRef.leafletElement && typeof mapRef.leafletElement.fitBounds === "function") {
            mapRef.leafletElement.fitBounds(bounds.pad(0.2), { padding: [50, 50] });
          }
        } catch (e) {
          console.warn("fitBounds error", e);
        }
      }
    } catch (err) {
      console.warn("Route error:", err);
      alert("Could not fetch route. Check your ORS key and network. See console for details.");
      // fallback: just draw straight line between points so user still sees direction
      setRoutePoints([userPos, pregPos]);
    }

    // Close the modal(s)
    setModalPatient(null);
    setEmergencyModal(null);
  };

  // When hovering a row: open popup & change hover id
  const handleRowEnter = (id) => {
    setHoveredId(id);
    // open popup if marker reference exists
    const m = markersRef.current[id];
    if (m && typeof m.openPopup === "function") {
      try {
        m.openPopup();
      } catch (e) {}
    }
  };
  const handleRowLeave = (id) => {
    setHoveredId((prev) => (prev === id ? null : prev));
    const m = markersRef.current[id];
    if (m && typeof m.closePopup === "function") {
      try {
        m.closePopup();
      } catch (e) {}
    }
  };

  // Clicking a row should open the Patient Modal (not marker click)
  const handleRowClick = (patient) => {
    setModalPatient(patient);
    // optionally highlight and open popup too
    setHoveredId(patient.id);
    const m = markersRef.current[patient.id];
    if (m && typeof m.openPopup === "function") {
      try {
        m.openPopup();
      } catch (e) {}
    }
  };

  // helper: marker icons (red default, yellow highlight, blue user)
  const makeIcon = (url, size = [32, 32]) =>
    L.icon({
      iconUrl: url,
      iconSize: size,
      iconAnchor: [size[0] / 2, size[1]],
      popupAnchor: [0, -size[1]],
    });

  const redIconUrl = "https://maps.google.com/mapfiles/ms/icons/red.png";
  const yellowIconUrl = "https://maps.google.com/mapfiles/ms/icons/yellow.png";
  const blueIconUrl = "https://maps.google.com/mapfiles/ms/icons/blue.png";

  return (
    <div
      className="location-container"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      {/* Map Section */}
      <div style={{ flex: 1, minHeight: "320px" }}>
        <MapContainer
          whenCreated={(mapInstance) => setMapRef(mapInstance)}
          center={currentLocation || [11.0, 122.5]} // default center (Philippines-ish) if no user
          zoom={13}
          maxZoom={20}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationTracker setCurrentLocation={setCurrentLocation} />

          {/* Your Location marker */}
          {currentLocation && (
            <Marker
              position={currentLocation}
              icon={makeIcon(blueIconUrl, [32, 32])}
            >
              <Popup>Your Location</Popup>
            </Marker>
          )}

          {/* Big auto circle covering all pregnant markers */}
          {bigCircle && (
            <Circle
              center={bigCircle.center}
              radius={bigCircle.radius}
              pathOptions={{ color: "red", fillColor: "rgba(255,0,0,0.05)", weight: 2 }}
            />
          )}

          {/* Route polyline if drawn (street-following route from ORS or fallback straight line) */}
          {routePoints && routePoints.length > 1 && (
            <Polyline positions={routePoints} pathOptions={{ color: "blue", weight: 4 }} />
          )}

          {/* All pregnant markers */}
          {Object.values(locations).map((p) =>
            p.latitude && p.longitude ? (
              <React.Fragment key={p.id}>
                <Marker
                  position={[p.latitude, p.longitude]}
                  icon={makeIcon(hoveredId === p.id ? yellowIconUrl : redIconUrl, hoveredId === p.id ? [40, 40] : [32, 32])}
                  eventHandlers={{
                    // Marker click should only open its popup — don't open modal here
                    click: (e) => {
                      const markerInst = markersRef.current[p.id];
                      if (markerInst && typeof markerInst.openPopup === "function") {
                        try { markerInst.openPopup(); } catch (e) {}
                      }
                    },
                    popupclose: () => {
                      setHoveredId((prev) => (prev === p.id ? null : prev));
                    },
                  }}
                  ref={(el) => {
                    if (!el) {
                      delete markersRef.current[p.id];
                      return;
                    }
                    // support react-leaflet v2 and v3 differences
                    markersRef.current[p.id] = el?.leafletElement ? el.leafletElement : el;
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: "180px" }}>
                      <strong>{p.name}</strong>
                      <div style={{ fontSize: "0.9em", marginTop: "6px" }}>
                        <div><strong>Phone:</strong> {p.phone || "—"}</div>
                        <div><strong>Location:</strong> {p.location || "—"}</div>
                        <div><strong>Updated:</strong> {formatTimeAgo(p.timestamp)}</div>
                        <div style={{ marginTop: 6 }}>
                          <small style={{ color: "#777" }}>Click the row in the table to view details & actions</small>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Pulsing / wave circle for each marker — larger when hovered */}
                <Circle
                  center={[p.latitude, p.longitude]}
                  radius={hoveredId === p.id ? Math.max(60, waveRadius * 1.6) : waveRadius}
                  pathOptions={{
                    color: "red",
                    fillColor: "red",
                    fillOpacity: hoveredId === p.id ? 0.25 : 0.12,
                    weight: hoveredId === p.id ? 2 : 1,
                    dashArray: hoveredId === p.id ? "4" : null,
                  }}
                />
              </React.Fragment>
            ) : null
          )}
        </MapContainer>
      </div>

      {/* Emergency Modal (auto-open when there are emergencies) */}
      <CenteredModal
        show={!!emergencyModal}
        onClose={() => setEmergencyModal(null)}
        title="🚨 Emergency Alert"
      >
        {emergencyModal && (
          <div>
            <h2 style={{ marginTop: 0 }}>{emergencyModal.name}</h2>
            <p><strong>Phone:</strong> {emergencyModal.phone}</p>
            <p><strong>Last Updated:</strong> {formatTimeAgo(emergencyModal.timestamp)}</p>
            <p><strong>Location:</strong> {emergencyModal.location}</p>
            <p>
              <strong>Emergency Level:</strong>{" "}
              <span style={getBadgeStyle(emergencyModal.emergencyLevel)}>
                {emergencyModal.emergencyLevel}
              </span>
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                style={{
                  padding: "10px 15px",
                  background: "#d32f2f",
                  color: "#fff",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                }}
                onClick={() => {
                  handleLocatePregnant(emergencyModal);
                }}
              >
                🚑 Locate Pregnant
              </button>
            </div>
          </div>
        )}
      </CenteredModal>

      {/* Recent Alerts Table */}
      {recentList.length > 0 && (
        <div style={{ overflowX: "auto", padding: "10px", maxHeight: "40vh" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>🕒 Recent Alerts</h3>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPageIndex(0);
              }}
              style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #3498db", color: "#3498db", fontWeight: "bold" }}
            >
              <option>All</option>
              {Array.from({ length: 12 }, (_, i) => {
                const month = new Date(0, i).toLocaleString("default", { month: "long" });
                return <option key={month}>{month}</option>;
              })}
            </select>
          </div>

          <table className="recent-alerts-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th>No.</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Date</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.length > 0 ? (
                paginatedList.map((p, idx) => (
                  <tr
                    key={p.id}
                    onMouseEnter={() => handleRowEnter(p.id)}
                    onMouseLeave={() => handleRowLeave(p.id)}
                    onClick={() => handleRowClick(p)} // click row opens modal now
                    style={{
                      background: hoveredId === p.id ? "rgba(255,235,205,0.6)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <td>{pageIndex * rowsPerPage + idx + 1}</td>
                    <td>{p.name}</td>
                    <td>{p.phone}</td>
                    <td>{p.location}</td>
                    <td>{new Date(p.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
                    <td>{new Date(p.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</td>
                    <td>
                      <button onClick={(e) => { e.stopPropagation(); handleViewLaborStatus(p.id); }}>View Labor Status</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", fontStyle: "italic" }}>No data available</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination small buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 10 }}>
            <button
              onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={pageIndex === 0}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #ccc",
                cursor: pageIndex === 0 ? "not-allowed" : "pointer",
                background: pageIndex === 0 ? "#f3f3f3" : "#1976d2",
              }}
            >
              ◀ Previous
            </button>
            <div style={{ minWidth: 140, textAlign: "center", fontWeight: "600" }}>
              Page {pageIndex + 1} of {pageCount}
            </div>
            <button
              onClick={() => setPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
              disabled={pageIndex >= pageCount - 1}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #ccc",
                cursor: pageIndex >= pageCount - 1 ? "not-allowed" : "pointer",
                background: pageIndex >= pageCount - 1 ? "#f3f3f3" : "#1976d2",
              }}
            >
              Next ▶
            </button>
          </div>
        </div>
      )}

      {/* Patient Modal (opened by clicking table row) */}
      <CenteredModal
        show={!!modalPatient}
        onClose={() => {
          setModalPatient(null);
          setRoutePoints([]);
        }}
        title="Patient Details"
      >
        {modalPatient && (
          <div>
            <h2 style={{ marginTop: 0 }}>{modalPatient.name}</h2>
            <p><strong>Phone:</strong> {modalPatient.phone}</p>
            <p><strong>Last Updated:</strong> {formatTimeAgo(modalPatient.timestamp)}</p>
            <p><strong>Location:</strong> {modalPatient.location}</p>
            <p>
              <strong>Emergency Level:</strong>{" "}
              <span style={getBadgeStyle(modalPatient.emergencyLevel)}>
                {modalPatient.emergencyLevel}
              </span>
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                style={{
                  padding: "10px 15px",
                  background: "#1976d2",
                  color: "#fff",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                }}
                onClick={() => handleLocatePregnant(modalPatient)}
              >
                Locate Pregnant
              </button>
            </div>
          </div>
        )}
      </CenteredModal>

      {/* Labor Status Modal */}
      <CenteredModal show={!!laborStatus} onClose={() => setLaborStatus(null)} title="Labor Status">
        {laborStatus && (
          <div>
            <h2 style={{ marginTop: 0 }}>Labor Status</h2>
            {laborStatus.message ? (
              <p>{laborStatus.message}</p>
            ) : (
              <div>
                {Object.entries(laborStatus.answers || {}).map(([key, val]) => (
                  <p key={key}><strong>{key}:</strong> {val || "—"}</p>
                ))}
                <p><strong>Emergency Level:</strong> {laborStatus.emergencyLevel}</p>
                <p><strong>Notes:</strong> {laborStatus.notes || "—"}</p>
              </div>
            )}
          </div>
        )}
      </CenteredModal>
    </div>
  );
}
