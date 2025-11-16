import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaFileAlt,
  FaUserPlus
} from "react-icons/fa";
import styles from "./Sidebar.module.css";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit
} from "firebase/firestore";

const db = getFirestore();

const Sidebar = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [adminName, setAdminName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newNotif, setNewNotif] = useState(null);

  // Reports dropdown state
  const [openReports, setOpenReports] = useState(false);

  // Auto-open dropdown when inside /app/reports/*
  useEffect(() => {
    if (location.pathname.startsWith("/app/reports")) {
      setOpenReports(true);
    }
  }, [location.pathname]);

  // Fetch admin name
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const ref = doc(db, "admins", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setAdminName(snap.data().name);
      } else {
        setAdminName("");
      }
    });
    return () => unsub();
  }, []);

  // Listen for notifications
  useEffect(() => {
    const notifRef = collection(db, "admin_notifications");
    const q = query(notifRef, orderBy("createdAt", "desc"), limit(1));

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setNewNotif(doc.data());
        setShowModal(true);
      }
    });

    return () => unsub();
  }, []);

  const linkStyle = ({ isActive }) =>
    `${styles.link} ${isActive ? styles.active : ""}`;

  return (
    <>
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <div className={styles.logoContainer}>
          <img src="/logo_512.png" alt="Logo" className={styles.logo} />
          {open && <h1 className={styles.admin}>Barangay Health Midwife</h1>}
        </div>

        <nav className={styles.nav}>

          {/* Dashboard */}
          <NavLink to="/app/dashboard" className={linkStyle}>
            <FaTachometerAlt className={styles.icon} />
            {open && <span className={styles.label}>Dashboard</span>}
          </NavLink>

          {/* ========== GENERATE REPORTS (NAVIGATE + DROPDOWN) ========== */}
          <div
            className={`${styles.link} ${
              location.pathname.startsWith("/app/reports") ? styles.active : ""
            }`}
            onClick={() => {
              navigate("/app/reports");
              setOpenReports((prev) => !prev);
            }}
          >
            <FaFileAlt className={styles.icon} />
            {open && <span className={styles.label}>Generate Reports</span>}
            {open && (
              <span className={styles.arrow}>
                {openReports ? "▲" : "▼"}
              </span>
            )}
          </div>

          {/* Dropdown Items */}
          {openReports && open && (
            <div className={styles.dropdownMenu}>
              <NavLink
                to="/app/DueWeekReports"
                className={styles.sublink}
              >
                Due Week Reports
              </NavLink>

              <NavLink
                to="/app/HealthStatus"
                className={styles.sublink}
              >
                Health Status Reports
              </NavLink>

              <NavLink
                to="/app/LaborStatusReports"
                className={styles.sublink}
              >
                Labor Status Reports
              </NavLink>

              <NavLink
                to="/app/DeliveredReports"
                className={styles.sublink}
              >
                Delivered Reports
              </NavLink>

              <NavLink
                to="/app/TotalPregnant"
                className={styles.sublink}
              >
                Total Pregnant Reports
              </NavLink>
            </div>
          )}
          {/* =========================================================== */}

          {/* Assign Pregnant */}
          <NavLink to="/app/AssignPregnantBhw" className={linkStyle}>
            <FaUserPlus className={styles.icon} />
            {open && <span className={styles.label}>Assign Pregnant</span>}
          </NavLink>

          {/* User Management */}
          <NavLink to="/app/users" className={linkStyle}>
            <FaUsers className={styles.icon} />
            {open && <span className={styles.label}>User Management</span>}
          </NavLink>
        </nav>
      </aside>

      {/* Notification Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>📢 New Notification</h3>
            <p className={styles.modalMessage}>
              {newNotif?.message || "You have a new notification!"}
            </p>
            <button
              className={styles.modalButton}
              onClick={() => setShowModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
