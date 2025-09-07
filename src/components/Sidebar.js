import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaTachometerAlt, FaChartBar, FaUsers, FaCog, FaSignOutAlt } from 'react-icons/fa';
import styles from './Sidebar.module.css';

// 🔑 Firebase imports
import { auth } from '../firebase'; // adjust path to your firebase.js config
import { onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// ✅ import your custom logo
import myLogo from '../assets/logo_round.png'; // adjust path to your logo

const db = getFirestore();

const Sidebar = () => {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");

  const linkStyle = ({ isActive }) =>
    `${styles.link} ${isActive ? styles.active : ''}`;

  const handleLogout = () => {
    // TODO: Add your actual logout logic here (e.g. Firebase signOut)
    console.log("User logged out");

    // Redirect to login page
    navigate('/login');
  };

  // 🔑 Fetch admin name from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "admins", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setAdminName(docSnap.data().name);
          } else {
            console.log("No admin doc for this UID");
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
    <aside className={styles.sidebar}>
      <div>
        {/* ✅ Changed from text to image logo */}
        <img src={myLogo} alt="Admin Midwife" className={styles.logo} />
          <h1 className={styles.admin}>Barangay Health Midwife</h1>

        <nav className={styles.nav}>
          <NavLink to="/app/dashboard" className={linkStyle} >
            <FaTachometerAlt /> Dashboard
          </NavLink>
          <NavLink to="/app/reports" className={linkStyle}>
            <FaChartBar /> Reports & Analytics
          </NavLink>
          <NavLink to="/app/users" className={linkStyle}>
            <FaUsers /> User Management
          </NavLink>
          <NavLink to="/app/settings" className={linkStyle}>
            <FaCog /> Account Settings
          </NavLink>
        </nav>
      </div>

      <div className={styles.profile}>
        <div className={styles.avatar}>
          {adminName ? adminName.charAt(0).toUpperCase() : "A"}
        </div>
        <div className={styles.profileText}>
          {/* ✅ Use admin name if available, fallback to your original */}
          <p>{adminName || "Dr. Sarah Geronimo"}</p>
          <p>Admin</p>
        </div>
        <button className={styles.logoutButton} onClick={handleLogout}>
          <FaSignOutAlt style={{ marginRight: '8px' }} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
