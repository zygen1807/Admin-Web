import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUserCircle, FaBell, FaCog } from "react-icons/fa";
import Sidebar from "./Sidebar";
import styles from "./Layout.module.css";

import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

const db = getFirestore();

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [adminName, setAdminName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleDropdown = () => setShowDropdown((prev) => !prev);
  const toggleNotifModal = () => setShowNotifModal((prev) => !prev);

  const handleLogout = () => {
    console.log("User logged out");
    navigate("/LandingPage");
  };
  const handleSettings = () => {
    navigate("/app/settings");
  }

  // open logout modal instead of directly logging out
  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleLogoutCancel = () => setShowLogoutModal(false);
  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    // call the existing logout logic
    handleLogout();
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
    else if (path.includes("adminpendingusers")) setPageTitle("AdminPendingUsers");
    else if (path.includes("users")) setPageTitle("User Management");
    else if (path.includes("settings")) setPageTitle("Account Settings");
    else if (path.includes("landingpage")) setPageTitle("LandingPage");
    else if (path.includes("assignpregnantbhw")) setPageTitle("Assign Pregnant BHW");
    else if (path.includes("adminnotifications")) setPageTitle("Admin Notifications");
    else if (path.includes("adminnotificationwatcher")) setPageTitle("Admin Notification Watcher");
    else if (path.includes("archive_records")) setPageTitle("Pregnant Archived Records");
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

  // 🔹 Listen for notifications
useEffect(() => {
  const q = query(
    collection(db, "admin_notifications"),
    orderBy("createdAt", "desc")
  );

  const unsub = onSnapshot(q, (snapshot) => {
    const notifList = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      let message = data.message;

      // ✅ Ensure message is correct and includes center name
      if (data.userType === "Rescuer") {
        const d = data.createdAt?.toDate
          ? new Date(data.createdAt.toDate())
          : new Date();
        const formattedDate = d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const formattedTime = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        message = `${data.rescuerName || "Unknown Rescuer"} delivered ${
  data.patientName || "Unknown Patient"
} to ${data.center_name || data.centerName || "Unknown Center"} on ${formattedDate}, ${formattedTime}`;

      }

      notifList.push({ id: doc.id, ...data, message });
    });

    // ✅ Remove duplicates (same rescuer + patient + message)
    const uniqueList = notifList.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.rescuerId === item.rescuerId &&
            t.patientName === item.patientName &&
            t.message === item.message
        )
    );

    // ✅ Ensure Rescuer notifications appear properly
    setNotifications(uniqueList);
  });

  return () => unsub();
}, []);

  // 🔹 Filter notifications per tab
const filteredNotifs =
  selectedTab === "All"
    ? notifications
    : notifications.filter((n) => n.userType === selectedTab);

  return (
    <div className={styles.layout}>
      {/* 🔹 Topbar */}
      <div className={styles.topbar}>
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

        <h2 style={{ marginLeft: "10px", flex: 1,color:"white" }}>{pageTitle}</h2>

        {/* 🔔 Notification Icon */}
        <FaBell
          className={styles.notifIcon}
          onClick={toggleNotifModal}
          style={{
            cursor: "pointer",
            marginRight: "20px",
             padding: '5px',
            color: "#007e96",
          }}
        />

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
              <button onClick={handleLogoutClick} className={styles.dropdownItem}>
                <FaSignOutAlt style={{ marginRight: "8px" }} /> Logout
              </button>
              <button onClick={handleSettings} className={styles.dropdownItem}>
                <FaCog style={{ marginRight: "8px" }} /> Settings
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

      {/* 🔔 Notification Modal */}
      {showNotifModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div
              className={styles.modalHeader}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>Notifications</h3>
             <button
  onClick={toggleNotifModal}
  style={{
    border: "none",
    background: "transparent",
    fontSize: "20px",
    cursor: "pointer",
    color: "#000", // ✅ black color for visibility
    fontWeight: "bold",
  }}
>
  ✖
</button>

            </div>

            {/* 🔹 Tabs */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              {["All", "Rescuer", "Bhw", "Pregnant"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    background:
                      selectedTab === tab ? "#007bff" : "rgba(0,0,0,0.1)",
                    color: selectedTab === tab ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 🔹 Notifications List */}
            <div
              style={{
                marginTop: "15px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {filteredNotifs.length > 0 ? (
                filteredNotifs.map((n) => {
                 const color =
  n.userType === "Rescuer"
    ? "#f91900ff"  
    : n.userType === "Bhw"
    ? "#0097fcff"  
    : n.userType === "Pregnant"
    ? "#de54cbff"  
    : "#7f8c8d";  



                  return (
                    <div
  key={n.id}
  style={{
    display: "flex",
    alignItems: "center",
    padding: "10px",
    borderBottom: "1px solid #ddd",
    cursor: "pointer",
  }}
  onClick={() => setSelectedNotif(n)}
>
  <div
  style={{
    width: "35px",
    height: "35px",
    borderRadius: "50%",
    backgroundColor: color, // ✅ filled color
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    marginRight: "10px",
  }}
>
  {(n.rescuerName || n.bhwName || n.pregnantName || n.patientName || "U")
  .charAt(0)
  .toUpperCase()}

</div>

  <div>
   <p style={{ fontWeight: "bold", margin: 0 }}>
  {n.rescuerName ||
    n.bhwName ||
    n.pregnantName ||
    n.patientName ||
    `Unknown ${n.userType}`}
</p>

    <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
  {n.createdAt?.toDate
    ? (() => {
        const d = new Date(n.createdAt.toDate());
        const formattedDate = d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const formattedTime = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        return `${formattedDate} • ${formattedTime}`;
      })()
    : ""}
</p>

  </div>
</div>
                  );
                })
              ) : (
                <p style={{ textAlign: "center", marginTop: "20px" }}>
                  No notifications yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Message Detail Modal */}
      {selectedNotif && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div
              className={styles.modalHeader}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>Message Detail</h3>
              <button
                onClick={() => setSelectedNotif(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#000", 
                  fontWeight: "bold",
                }}
              >
                ✖
              </button>
            </div>
         <p style={{ marginTop: "15px", lineHeight: "1.5" }}>
  {selectedNotif.message ? (
    selectedNotif.message
  ) : (
    <>
      <strong style={{ fontWeight: "700" }}>
        {selectedNotif.rescuerName || "Unknown Rescuer"}
      </strong>{" "}
      delivered{" "}
      <strong style={{ fontWeight: "700" }}>
        {selectedNotif.patientName || "Unknown Patient"}
      </strong>{" "}
      to{" "}
      <strong style={{ fontWeight: "700" }}>
        {selectedNotif.center_name ||
          selectedNotif.centerName ||
          "Unknown Center"}
      </strong>{" "}
      on{" "}
      <strong style={{ fontWeight: "700" }}>
        {selectedNotif.createdAt?.toDate
          ? selectedNotif.createdAt.toDate().toLocaleString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "Unknown time"}
      </strong>
    </>
  )}
</p>

          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div className={styles.logoutModalOverlay} role="dialog" aria-modal="true">
          <div className={styles.logoutModal}>
            <h3 className={styles.logoutModalTitle}>Confirm Logout</h3>
            <p className={styles.logoutModalText}>Are you sure you want to sign out?</p>
            <div className={styles.logoutButtonStack}>
              <button className={styles.logoutConfirmBtn} onClick={handleLogoutConfirm}>
                Logout
              </button>
              <button className={styles.logoutCancelBtn} onClick={handleLogoutCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
