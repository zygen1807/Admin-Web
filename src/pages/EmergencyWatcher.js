import React, { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./EmergencyWatcher.css"; // create this file for modal styling

export default function EmergencyWatcher() {
  const [show, setShow] = useState(false);
  const [emergencies, setEmergencies] = useState([]);
  const audioRef = useRef(null);

  // format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const diffMs = Date.now() - timestamp;
    const sec = Math.floor(diffMs / 1000);
    if (sec < 10) return "Now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  };

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

  useEffect(() => {
    // preload sound
    audioRef.current = new Audio("/notif.mp3");
    audioRef.current.load();

    const enableSound = () => {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      window.removeEventListener("click", enableSound);
    };

    window.addEventListener("click", enableSound);

    // listen to pregnant_locations
    const unsub = onSnapshot(collection(db, "pregnant_locations"), async (snapshot) => {
      const now = Date.now();
      const emergencyArr = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const ts = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp;

        // emergency only = within 5 mins
        if (!ts || now - ts > 5 * 60 * 1000) continue;

        // get name + phone
        let name = "Unknown";
        let phone = "";
        const userDoc = await getDoc(doc(db, "pregnant_users", docSnap.id));
        if (userDoc.exists()) {
          name = userDoc.data().name;
          phone = userDoc.data().phone;
        }

        // get emergency level
        let emergencyLevel = "Unknown";
        const statusDoc = await getDoc(doc(db, "pregnant_status", docSnap.id));
        if (statusDoc.exists()) {
          emergencyLevel = statusDoc.data().emergencyLevel || "Unknown";
        }

        emergencyArr.push({
          id: docSnap.id,
          name,
          phone,
          timestamp: ts,
          emergencyLevel,
          location: data.location || "Unknown location",
        });
      }

      if (emergencyArr.length > 0) {
        setEmergencies(emergencyArr);
        setShow(true);

        // play sound
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    });

    return () => unsub();
  }, []);

  if (!show) return null;

  return (
    <div className="ew-overlay">
      <div className="ew-modal">
        <h2>🚨 Emergency Alerts</h2>

        <div className="ew-card-list">
          {emergencies.map((p) => (
            <div className="ew-card" key={p.id}>
              <div className="ew-card-header">
                <span className="name">
                  {p.name} <small>({formatTimeAgo(p.timestamp)})</small>
                </span>
                <span className="badge" style={getBadgeStyle(p.emergencyLevel)}>
                  {p.emergencyLevel}
                </span>
              </div>

              <p><strong>Location:</strong> {p.location}</p>
              <p><strong>Phone:</strong> {p.phone}</p>
            </div>
          ))}
        </div>

        <button className="ew-btn" onClick={() => setShow(false)}>
          OK
        </button>
      </div>
    </div>
  );
}
