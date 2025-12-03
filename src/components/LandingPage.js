import React, { useState } from "react";
import "./LandingPage.css";

import Homes from "./Homes";
import About from "./About";
import Services from "./Services";
import Developer from "./Developer";
import { useNavigate } from "react-router-dom";

import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Homes");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 🔑 Register Modal States
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [adminKeyError, setAdminKeyError] = useState("");
  const [showAdminSuccess, setShowAdminSuccess] = useState(false);

  const tabs = [
    { id: "Homes", label: "Home", component: <Homes /> },
    { id: "About", label: "About Us", component: <About /> },
    { id: "Services", label: "Services", component: <Services /> },
    { id: "Developer", label: "Developer", component: <Developer /> },
  ];

  // ---------------------- ADMIN KEY SUBMIT ----------------------
  const handleAdminKeySubmit = async () => {
    setAdminKeyError("");

    if (!accessKey.trim()) {
      setAdminKeyError("Admin Access Key is required.");
      return;
    }

    try {
      const ref = collection(db, "admin_access_key");
      const snapshot = await getDocs(ref);

      if (snapshot.empty) {
        setAdminKeyError("No admin access key found in database.");
        return;
      }

      let matched = false;

      snapshot.forEach((doc) => {
        if (doc.data().key.trim() === accessKey.trim()) {
          matched = true;
        }
      });

      if (!matched) {
        setAdminKeyError("Wrong Admin Access Key");
        return;
      }

      // Success!
      setShowAdminModal(false);
      setShowAdminSuccess(true);
    } catch (err) {
      console.log("❌ FIRESTORE ERROR:", err);
      setAdminKeyError("Error checking access key.");
    }
  };

  return (
    <div className="lp-root">
      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-header-inner">
          {/* LEFT */}
          <div className="lp-logo-row">
            <img src="/logo_round.png" alt="PALMS" className="lp-logo" />
            <div className="lp-app-title">
              <span className="first-letter">P</span>regnancy{" "}
              <span className="first-letter">A</span>ctive{" "}
              <span className="first-letter">L</span>ocation{" "}
              <span className="first-letter">M</span>apping{" "}
              <span className="first-letter">S</span>ystem
            </div>
          </div>

          {/* CENTER NAV */}
          <nav className="lp-nav desktop-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`lp-nav-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* RIGHT AUTH BUTTONS */}
          <div className="desktop-auth">
            <button className="lp-btn-out" onClick={() => navigate("/login")}>
              Login
            </button>
            <button
              className="lp-btn-fill"
              onClick={() => setShowAdminModal(true)}
            >
              Register
            </button>
          </div>

          {/* MOBILE MENU */}
          <button
            className="lp-menu-btn"
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            {drawerOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* MOBILE NAV DRAWER */}
      {drawerOpen && (
        <div className="lp-drawer">
          <div className="drawer-top">
            <span className="drawer-title">Menu</span>
          </div>

          <div className="drawer-links">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="drawer-item"
                onClick={() => {
                  setActiveTab(tab.id);
                  setDrawerOpen(false);
                }}
              >
                {tab.label}
              </div>
            ))}

            <hr />
            <button
              className="drawer-login-btn"
              onClick={() => navigate("/login")}
            >
              Login
            </button>

            {/* Register Button */}
            <button
              className="drawer-signup-btn"
              onClick={() => {
                setDrawerOpen(false);
                setShowAdminModal(true);
              }}
            >
              Register
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="lp-main">
        {tabs.find((t) => t.id === activeTab)?.component}
      </main>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="footer-col">
            <h2 className="footer-title">PALMS</h2>
            <p className="footer-small">
              <strong>P</strong>regnancy <strong>A</strong>ctive{" "}
              <strong>L</strong>ocation <strong>M</strong>apping{" "}
              <strong>S</strong>ystem
            </p>
            <p className="footer-msg">
              Empowering barangay Mapaya with real-time maternal safety.
            </p>
          </div>

          <div className="footer-col">
            <h3 className="footer-title">Quick Links</h3>
            <ul className="footer-links">
              <li onClick={() => setActiveTab("About")}>About Us</li>
              <li onClick={() => setActiveTab("Services")}>Services</li>
              <li onClick={() => setActiveTab("Developer")}>Developer</li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-title">Contact Us</h3>
            <p>Email: palms.support@gmail.com</p>
            <p>Phone: +63 912 345 6789</p>
            <p>Address: Barangay Health Center, Philippines</p>
          </div>
        </div>

        <div className="lp-footer-bottom">
          © {new Date().getFullYear()} PALMS — All Rights Reserved.
        </div>
      </footer>

      {/* ---------------- ADMIN ACCESS MODAL ---------------- */}
      {showAdminModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Enter Admin Access Key</h3>
             <p>You must enter the admin key from the Super Admin or contact the owner
              to register an account.
             </p>

            <input
              type="text"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="Admin Access Key"
            />

            {adminKeyError && (
              <p className="error-text" style={{ marginTop: "5px" }}>
                {adminKeyError}
              </p>
            )}

            <div className="modal-buttons">
              <button className="auth-button" onClick={handleAdminKeySubmit}>
                Submit
              </button>
              <button
                className="auth-button cancel"
                onClick={() => setShowAdminModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ADMIN KEY SUCCESS ---------------- */}
      {showAdminSuccess && (
        <div className="modal-overlay">
          <div className="success-reset-modal">
            <img
              src="https://cdn-icons-png.flaticon.com/512/845/845646.png"
              alt="success"
              className="success-icon"
            />

            <h2>Access Granted</h2>
            <p>You may now register your account.</p>

            <button
              className="auth-button"
              onClick={() => navigate("/Signup")}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
