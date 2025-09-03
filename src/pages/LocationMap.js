// src/pages/LocationMap.js
import React, { useEffect, useState, useRef } from "react";
import "./LocationMap.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  Circle
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore";
import { useLocation } from "react-router-dom";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

// 🕒 Time Ago Helper
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

export default function LocationMap() {
  const location = useLocation();
  const emergencyData = location.state?.emergency ? location.state : null;

  const [patients, setPatients] = useState({});
  const [riskData, setRiskData] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [map, setMap] = useState(null);
  const navigateTargetRef = useRef(null);
  const [waveRadius, setWaveRadius] = useState(50);
  const [, forceUpdate] = useState({}); // trigger rerenders for time ago

  const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZkMTRiNTUzNTZhNTQyYWY4MjA3YjNkMzE0MzkwMzE3IiwiaCI6Im11cm11cjY0In0=";

  // Force UI to refresh time labels every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Animate red wave
  useEffect(() => {
    if (emergencyData?.emergency) {
      const interval = setInterval(() => {
        setWaveRadius((r) => (r >= 300 ? 50 : r + 10));
      }, 200);
      return () => clearInterval(interval);
    }
  }, [emergencyData]);

  // Merge pregnant_users with pregnant_locations
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "pregnant_users"), (snap) => {
      const userData = {};
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        userData[docSnap.id] = {
          id: docSnap.id,
          name: data?.name || "Unnamed",
          phone: data?.phone || "",
          address: data?.address || "Unknown",
          latitude: null,
          longitude: null,
          timestamp: null
        };
      });
      setPatients(userData);

      snap.docs.forEach(async (docSnap) => {
        const checkupSnap = await getDoc(doc(db, "checkup_record", docSnap.id));
        const risk = checkupSnap.exists()
          ? checkupSnap.data()?.riskAssessment
          : null;
        if (risk) {
          setRiskData((prev) => ({ ...prev, [docSnap.id]: risk }));
        }
      });
    });

    const unsubLocations = onSnapshot(collection(db, "pregnant_locations"), (snap) => {
      setPatients((prev) => {
        const updated = { ...prev };
        snap.docs.forEach((docSnap) => {
          const loc = docSnap.data();
          if (updated[docSnap.id]) {
            updated[docSnap.id] = {
              ...updated[docSnap.id],
              latitude: loc.latitude,
              longitude: loc.longitude,
              timestamp: loc.timestamp?.toMillis ? loc.timestamp.toMillis() : loc.timestamp
            };
          }
        });
        return updated;
      });
    });

    return () => {
      unsubUsers();
      unsubLocations();
    };
  }, []);

  const getRouteToPregnant = async (pregnant) => {
    if (!pregnant.latitude || !pregnant.longitude) {
      alert("No live location available for this patient.");
      return;
    }
    navigateTargetRef.current = pregnant;

    try {
      const routeUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${currentLocation[1]},${currentLocation[0]}&end=${pregnant.longitude},${pregnant.latitude}`;
      const response = await axios.get(routeUrl);

      if (response.data && response.data.features.length > 0) {
        const coords = response.data.features[0].geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );
        setRouteCoords(coords);
        if (map) {
          map.fitBounds(L.latLngBounds(coords));
        }
      }
    } catch (error) {
      console.error("Route fetch failed:", error);
    }
  };

  const callPhone = (number) => {
    window.open(`tel:${number}`);
  };

  // Split into Emergencies & Recent Alerts
  const now = Date.now();
  const emergencyList = [];
  const recentList = [];

  Object.values(patients).forEach((p) => {
    if (p.latitude && p.longitude && p.timestamp) {
      const minutesAgo = (now - p.timestamp) / 60000;
      if (minutesAgo <= 5) {
        emergencyList.push(p);
      } else {
        recentList.push(p);
      }
    }
  });

  return (
    <div className="location-container horizontal-layout">
      <div className="map-wrapper">
        <MapContainer
          center={emergencyData?.coords || currentLocation || [0, 0]}
          zoom={16}
          maxZoom={20}
          scrollWheelZoom={true}
          zoomControl={true}
          className="map"
          whenCreated={setMap}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={20}
          />
          <LocationTracker setCurrentLocation={setCurrentLocation} />

          {currentLocation && (
            <Marker
              position={currentLocation}
              icon={L.icon({
                iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue.png",
                iconSize: [32, 32],
                iconAnchor: [16, 32]
              })}
            >
              <Popup>Your Location</Popup>
            </Marker>
          )}

          {emergencyData?.emergency && (
            <>
              <Marker
                position={[
                  emergencyData.coords.latitude,
                  emergencyData.coords.longitude
                ]}
                icon={L.icon({
                  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  iconSize: [32, 32],
                  iconAnchor: [16, 32]
                })}
              >
                <Popup>🚨 Emergency Location</Popup>
              </Marker>
              <Circle
                center={[
                  emergencyData.coords.latitude,
                  emergencyData.coords.longitude
                ]}
                radius={waveRadius}
                pathOptions={{ color: "red", fillColor: "red", fillOpacity: 0.2 }}
              />
            </>
          )}

          {Object.values(patients).map(
            (p) =>
              p.latitude &&
              p.longitude && (
                <Marker
                  key={p.id}
                  position={[p.latitude, p.longitude]}
                  icon={L.icon({
                    iconUrl: "https://maps.google.com/mapfiles/ms/icons/red.png",
                    iconSize: [32, 32],
                    iconAnchor: [16, 32]
                  })}
                >
                  <Popup>
                    <strong>{p.name}</strong>
                    <br />
                    {p.address}
                    <br />
                    {p.phone}
                    <br />
                    <em>{riskData[p.id] || "No Risk Info"}</em>
                  </Popup>
                </Marker>
              )
          )}

          {routeCoords.length > 0 && (
            <Polyline positions={routeCoords} color="blue" />
          )}
        </MapContainer>
      </div>

      <div className="card-list">
        {emergencyList.length > 0 && <h3>🚨 Emergencies</h3>}
        {emergencyList.map((p) => (
          <div className="card" key={p.id}>
            <div className="card-header">
              <span className="name">
                {p.name}{" "}
                <small style={{ color: "#888", fontWeight: "normal" }}>
                  ({formatTimeAgo(p.timestamp)})
                </small>
              </span>
              {riskData[p.id] && (
                <span className={`risk-badge ${riskData[p.id].toLowerCase().replace(" ", "-")}`}>
                  {riskData[p.id]}
                </span>
              )}
            </div>
            <p className="address">{p.address}</p>
            <p className="phone">{p.phone}</p>
            <div className="btn-row">
              <button className="call-btn" onClick={() => callPhone(p.phone)}>📞 Call</button>
              <button className="locate-btn" onClick={() => getRouteToPregnant(p)}>✔ Navigate</button>
            </div>
          </div>
        ))}

        {recentList.length > 0 && <h3>🕒 Recent Alerts</h3>}
        {recentList.map((p) => (
          <div className="card" key={p.id}>
            <div className="card-header">
              <span className="name">
                {p.name}{" "}
                <small style={{ color: "#888", fontWeight: "normal" }}>
                  ({formatTimeAgo(p.timestamp)})
                </small>
              </span>
              {riskData[p.id] && (
                <span className={`risk-badge ${riskData[p.id].toLowerCase().replace(" ", "-")}`}>
                  {riskData[p.id]}
                </span>
              )}
            </div>
            <p className="address">{p.address}</p>
            <p className="phone">{p.phone}</p>
            <div className="btn-row">
              <button className="call-btn" onClick={() => callPhone(p.phone)}>📞 Call</button>
              <button className="locate-btn" onClick={() => getRouteToPregnant(p)}>✔ Navigate</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
