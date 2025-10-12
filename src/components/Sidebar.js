import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaChartBar,
  FaUsers,
  FaCog,
  FaSignOutAlt,
  FaMapMarkedAlt,
  FaFileAlt,
} from "react-icons/fa";
import styles from "./Sidebar.module.css";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import myLogo from "./logo_round1.png";

const db = getFirestore();

const Sidebar = ({ open }) => {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");

  const linkStyle = ({ isActive }) =>
    `${styles.link} ${isActive ? styles.active : ""}`;

  const handleLogout = () => {
    console.log("User logged out");
    navigate("/login");
  };

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

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
      <div className={styles.logoContainer}>
        <img src={myLogo} alt="Logo" className={styles.logo} />
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
  );
};

export default Sidebar;
