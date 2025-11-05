import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaCog,
  FaFileAlt,
  FaUserPlus,
  FaBell
} from "react-icons/fa";
import styles from "./Sidebar.module.css";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";


const db = getFirestore();

const Sidebar = ({ open }) => {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newNotif, setNewNotif] = useState(null);

  const linkStyle = ({ isActive }) =>
    `${styles.link} ${isActive ? styles.active : ""}`;

  const handleLogout = () => {
    console.log("User logged out");
    navigate("/login");
  };

  // --- Fetch Admin Name ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "admins", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setAdminName(docSnap.data().name);
          }
        } catch (err) {
          console.error("Error fetching admin name:", err);
        }
      } else {
        setAdminName("");
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Listen for new notifications ---
  useEffect(() => {
    const notifRef = collection(db, "admin_notifications");
    const q = query(notifRef, orderBy("createdAt", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const notifData = doc.data();

        // Only trigger modal if it's a new notification (not first render)
        if (notifData.createdAt) {
          setNewNotif(notifData);
          setShowModal(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <div className={styles.logoContainer}>
        <img src="/logo_512.png" alt="Logo" className={styles.logo} /> 
          {open && <h1 className={styles.admin}>Barangay Health Midwife</h1>}
        </div>

        <nav className={styles.nav}>
          <NavLink to="/app/dashboard" className={linkStyle}>
            <FaTachometerAlt className={styles.icon} />
            {open && <span className={styles.label}>Dashboard</span>}
          </NavLink>

          <NavLink to="/app/reports" className={linkStyle}>
            <FaFileAlt className={styles.icon} />
            {open && <span className={styles.label}>Generate Reports</span>}
          </NavLink>

          <NavLink to="/app/AssignPregnantBhw" className={linkStyle}>
            <FaUserPlus className={styles.icon} />
            {open && <span className={styles.label}>Assign Pregnant</span>}
          </NavLink>

          <NavLink to="/app/users" className={linkStyle}>
            <FaUsers className={styles.icon} />
            {open && <span className={styles.label}>User Management</span>}
          </NavLink>

          <NavLink to="/app/settings" className={linkStyle}>
            <FaCog className={styles.icon} />
            {open && <span className={styles.label}>Account Settings</span>}
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
