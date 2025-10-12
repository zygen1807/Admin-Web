import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUserCircle } from "react-icons/fa";
import Sidebar from "./Sidebar";
import styles from "./Layout.module.css";

import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const db = getFirestore();

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [adminName, setAdminName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleDropdown = () => setShowDropdown((prev) => !prev);

  const handleLogout = () => {
    console.log("User logged out");
    navigate("/login");
  };

  // 🔹 Detect click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔹 Update title
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes("dashboard")) setPageTitle("Dashboard");
    else if (path.includes("reports")) setPageTitle("Generate Reports");
    else if (path.includes("locationmap")) setPageTitle("Location Mapping");
    else if (path.includes("AdminPendingUsers")) setPageTitle("AdminPendingUsers");
    else if (path.includes("users")) setPageTitle("User Management");
    else if (path.includes("settings")) setPageTitle("Account Settings");
    else setPageTitle("Dashboard");
  }, [location]);

  // 🔹 Fetch admin name
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
    <div className={styles.layout}>
      {/* 🔹 Topbar */}
      <div className={styles.topbar}>
        {/* Sidebar Toggle */}
        <button className={styles.toggleButton} onClick={toggleSidebar}>
          {sidebarOpen ? (
            <div className={styles.closeIcon}>
              <div className={styles.closeLine1}></div>
              <div className={styles.closeLine2}></div>
            </div>
          ) : (
            <div className={styles.hamburgerIcon}>
              <div className={styles.bar}></div>
              <div className={styles.bar}></div>
              <div className={styles.bar}></div>
            </div>
          )}
        </button>

        {/* Page Title */}
        <h2 style={{ marginLeft: "16px", flex: 1 }}>{pageTitle}</h2>

        {/* ✅ Profile Dropdown */}
        <div className={styles.profileDropdown} ref={dropdownRef}>
          <div className={styles.avatar} onClick={toggleDropdown}>
            {adminName ? adminName.charAt(0).toUpperCase() : "A"}
          </div>

          {showDropdown && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <FaUserCircle className={styles.dropdownAvatarIcon} />
                <p className={styles.dropdownName}>{adminName || "Admin"}</p>
              </div>
              <button onClick={handleLogout} className={styles.dropdownItem}>
                <FaSignOutAlt style={{ marginRight: "8px" }} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar + Main */}
      <div className={styles.contentArea}>
        <Sidebar open={sidebarOpen} />
        <main
          className={styles.mainContent}
          style={{
            marginLeft: sidebarOpen ? "220px" : "60px",
            transition: "margin-left 0.3s ease",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
