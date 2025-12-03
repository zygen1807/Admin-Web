import React, { useEffect, useState } from "react";
import "./LocationMap.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMap,
  Polyline
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { db } from "../firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// ---------- Helper Components ----------
function CenteredModal({ show, onClose, children }) {
  if (!show) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
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
      return { backgroundColor: "#e53935", color: "#fff" };
    case "risk emergency":
      return { backgroundColor: "#fb8c00", color: "#fff" };
    case "normal emergency":
      return { backgroundColor: "#42a5f5", color: "#fff" };
    default:
      return { backgroundColor: "#9e9e9e", color: "#fff" };
  }
};

// ---------- Location Tracker ----------
function LocationTracker({ setCurrentLocation }) {
  const map = useMap();
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latlng = [position.coords.latitude, position.coords.longitude];
        setCurrentLocation(latlng);
        map.setView(latlng, 16);
      },
      (err) => console.warn("Location error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, setCurrentLocation]);
  return null;
}

// ---------- Main Component ----------
export default function LocationMap() {
  const [locations, setLocations] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const [waveRadius, setWaveRadius] = useState(50);
  const [, forceUpdate] = useState({});
  const [modalPatient, setModalPatient] = useState(null);
  const [laborStatus, setLaborStatus] = useState(null);

  // NEW: route state
  const [routePoints, setRoutePoints] = useState([]);
  const [mapRef, setMapRef] = useState(null);

  // Pagination & Month filter
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState("All");


  

  // Refresh timestamps
  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 30000);
    return () => clearInterval(interval);
  }, []);

  // Circle animation
  useEffect(() => {
    const interval = setInterval(
      () => setWaveRadius((r) => (r >= 300 ? 50 : r + 10)),
      200
    );
    return () => clearInterval(interval);
  }, []);

  // Fetch pregnant locations
  useEffect(() => {
    const unsubLocations = onSnapshot(
      collection(db, "pregnant_locations"),
      (snap) => {
        snap.docs.forEach(async (docSnap) => {
          const loc = docSnap.data();

          let emergencyLevel = "Unknown";
          try {
            const statusDoc = await getDoc(
              doc(db, "pregnant_status", docSnap.id)
            );
            if (statusDoc.exists())
              emergencyLevel = statusDoc.data()?.emergencyLevel || "Unknown";
          } catch {}

          let name = "Unnamed";
          let phone = "";
          try {
            const userDoc = await getDoc(
              doc(db, "pregnant_users", docSnap.id)
            );
            if (userDoc.exists) {
              name = userDoc.data()?.name || "Unnamed";
              phone = userDoc.data()?.phone || "";
            }
          } catch {}

          setLocations((prev) => ({
            ...prev,
            [docSnap.id]: {
              id: docSnap.id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              timestamp: loc.timestamp?.toMillis
                ? loc.timestamp.toMillis()
                : loc.timestamp,
              name,
              phone,
              emergencyLevel,
              location: loc.location || "Unknown location",
            },
          }));
        });
      }
    );
    return () => unsubLocations();
  }, []);

  // Split emergencies and recent
  const now = Date.now();
  const emergencyList = [];
  const recentList = [];

  Object.values(locations).forEach((p) => {
    if (p.latitude && p.longitude && p.timestamp) {
      const minutesAgo = (now - p.timestamp) / 60000;
      if (minutesAgo <= 5) emergencyList.push(p);
      else {
        // Month filter
        if (selectedMonth === "All") recentList.push(p);
        else {
          const dateObj = new Date(p.timestamp);
          if (
            dateObj.toLocaleString("default", { month: "long" }) ===
            selectedMonth
          )
            recentList.push(p);
        }
      }
    }
  });

  // Labor Status Fetch
  const handleViewLaborStatus = async (patientId) => {
    try {
      const statusDoc = await getDoc(doc(db, "pregnant_status", patientId));
      if (statusDoc.exists()) {
        setLaborStatus({ id: patientId, ...statusDoc.data() });
      } else {
        setLaborStatus({ id: patientId, message: "No labor status found." });
      }
    } catch (err) {}
  };

  // NEW: Locate Pregnant (route drawing)
  const handleLocatePregnant = () => {
    if (!currentLocation || !modalPatient) return;

    const pregPos = [modalPatient.latitude, modalPatient.longitude];
    const userPos = currentLocation;

    setRoutePoints([userPos, pregPos]);

    if (mapRef) {
      const bounds = L.latLngBounds([userPos, pregPos]);
      mapRef.fitBounds(bounds, { padding: [50, 50] });
    }
  };

// Pagination calculations
const rowsPerPage = 5;
const startIndex = pageIndex * rowsPerPage;
const paginatedList = recentList.slice(startIndex, startIndex + rowsPerPage);
const pageCount = Math.ceil(recentList.length / rowsPerPage);


  return (
    <div
      className="location-container"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      {/* Map Section */}
      <div style={{ flex: 1, minHeight: "300px" }}>
        <MapContainer
          whenCreated={setMapRef}
          center={currentLocation || [0, 0]}
          zoom={16}
          maxZoom={20}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationTracker setCurrentLocation={setCurrentLocation} />

          {/* Current Location */}
          {currentLocation && (
            <Marker
              position={currentLocation}
              icon={L.icon({
                iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue.png",
                iconSize: [32, 32],
                iconAnchor: [16, 32],
              })}
            >
              <Popup>Your Location</Popup>
            </Marker>
          )}

          {/* Route Line */}
          {routePoints.length === 2 && (
            <Polyline positions={routePoints} pathOptions={{ color: "blue" }} />
          )}

          {/* Pregnant Locations */}
          {Object.values(locations).map(
            (p) =>
              p.latitude &&
              p.longitude && (
                <React.Fragment key={p.id}>
                  <Marker
                    position={[p.latitude, p.longitude]}
                    icon={L.icon({
                      iconUrl:
                        "https://maps.google.com/mapfiles/ms/icons/red.png",
                      iconSize: [32, 32],
                      iconAnchor: [16, 32],
                    })}
                    eventHandlers={{
                      click: () => {
                        setModalPatient(p);
                        setRoutePoints([]);
                      },
                    }}
                  />
                  <Circle
                    center={[p.latitude, p.longitude]}
                    radius={waveRadius}
                    pathOptions={{
                      color: "red",
                      fillColor: "red",
                      fillOpacity: 0.2,
                    }}
                  />
                </React.Fragment>
              )
          )}
        </MapContainer>
      </div>

      {/* Emergency Cards */}
      <div className="card-list" style={{ padding: "10px", overflowX: "auto" }}>
        {emergencyList.length > 0 && <h3>🚨 Emergencies</h3>}
        {emergencyList.map((p) => (
          <div className="card" key={p.id}>
            <div className="card-header">
              <span className="name">
                {p.name} <small>({formatTimeAgo(p.timestamp)})</small>
              </span>
              <span className="badge" style={getBadgeStyle(p.emergencyLevel)}>
                {p.emergencyLevel}
              </span>
            </div>
            <p>
              <strong>Location:</strong> {p.location}
            </p>
            <p>
              <strong>Phone:</strong> {p.phone}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Alerts Table */}
      {recentList.length > 0 && (
        <div style={{ overflowX: "auto", padding: "10px", maxHeight: "40vh" }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <h3>🕒 Recent Alerts</h3>
    <select
      value={selectedMonth}
      onChange={(e) => {
        setSelectedMonth(e.target.value);
        setPageIndex(0); // reset pagination when month changes
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

  <table className="recent-alerts-table" style={{ width: "100%", borderCollapse: "collapse" }}>
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
          <tr key={p.id}>
            <td>{pageIndex * rowsPerPage + idx + 1}</td>
            <td>{p.name}</td>
            <td>{p.phone}</td>
            <td>{p.location}</td>
            <td>{new Date(p.timestamp).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}</td>
            <td>{new Date(p.timestamp).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true })}</td>
            <td>
              <button onClick={() => handleViewLaborStatus(p.id)}>View Labor Status</button>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="7" style={{ textAlign:"center", fontStyle:"italic" }}>No data available</td>
        </tr>
      )}
    </tbody>
  </table>
</div>

      )}

      {/* Modal for Emergency / Patient Info */}
      <CenteredModal
        show={!!modalPatient}
        onClose={() => {
          setModalPatient(null);
          setRoutePoints([]);
        }}
      >
        {modalPatient && (
          <div>
            <h2>{modalPatient.name}</h2>
            <p><strong>Phone:</strong> {modalPatient.phone}</p>
            <p><strong>Last Updated:</strong> {formatTimeAgo(modalPatient.timestamp)}</p>
            <p><strong>Location:</strong> {modalPatient.location}</p>
            <p>
              <strong>Emergency Level:</strong>{" "}
              <span style={getBadgeStyle(modalPatient.emergencyLevel)}>
                {modalPatient.emergencyLevel}
              </span>
            </p>

            {/* Locate Pregnant Button */}
            <button
              style={{
                marginTop: "15px",
                padding: "10px 15px",
                background: "#1976d2",
                color: "#fff",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
              }}
              onClick={handleLocatePregnant}
            >
              Locate Pregnant
            </button>
          </div>
        )}
      </CenteredModal>

      {/* Labor Status Modal */}
      <CenteredModal show={!!laborStatus} onClose={() => setLaborStatus(null)}>
        {laborStatus && (
          <div>
            <h2>Labor Status</h2>
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
