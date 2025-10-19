// LandingPage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="logo-section">
          <img src="/logo_512.png" alt="PALMS Logo" className="logo" />
          <h2 className="app-title">
            PREGNANCY ACTIVE <br /> LOCATION MONITORING SYSTEM
          </h2>
        </div>
      </header>

      <main className="landing-content">
        <div className="text-section">
          <h1 className="main-title">
            MONITOR YOUR <br /> PREGNANCY AT HOME
          </h1>
          <p className="description">
            The Pregnancy Active Location Monitoring System (PALMS) Admin
            Dashboard provides a centralized platform for managing accounts of
            Barangay Health Workers (BHWs) and pregnant mothers of Barangay
            Mapaya. You can assign pregnant mothers to their respective BHWs,
            oversee account activities, and ensure proper coordination for
            effective monitoring and support.
          </p>

          <div className="button-group">
            <button className="btn get-started" onClick={() => navigate("/signup")}>
              Get Started
            </button>
            <button className="btn login" onClick={() => navigate("/login")}>
              Log in
            </button>
          </div>
        </div>

        <div className="image-section">
          <img src="/pregnant-illustration.png" alt="Pregnancy Illustration" className="hero-image" />
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
