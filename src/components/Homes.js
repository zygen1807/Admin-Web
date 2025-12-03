
import "./Homes.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
export default function Homes() {
  const navigate = useNavigate();
  const slides = [
  "/slider1.png",
  "/slider2.png",
  "/slider3.png",
];

const [currentSlide, setCurrentSlide] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, 3000); // 2 seconds per slide

  return () => clearInterval(interval); // cleanup
}, [slides.length]);

  return (
    <section className="home-section">

      {/* HEADER */}
      <div className="home-header">
        <h1>
          <span className="highlight">PALMS:</span> Pregnancy Active Location Mapping System
        </h1>
        <p className="home-subtitle">
         An Application Monitoring with Real-Time Location Mapping for Pregnant Women in Barangay Mapaya, San Jose, Occidental Mindoro, empowering Barangay Officials to track, manage, and respond to maternal care efficiently through PALMS.
        </p>
        <button className="get-started-btn" onClick={() => navigate("/login")}>Get Started</button>
      </div>

      {/* SLIDER SECTION */}
      <h2 className="homes-section-header">System Overview</h2>
      <div className="slider-container">
        <div className="slider-container">
  <div
    className="slider"
    style={{
      transform: `translateX(-${currentSlide * 100}%)`,
      transition: "transform 0.5s ease-in-out",
    }}
  >
    {slides.map((slide, index) => (
      <img key={index} src={slide} alt={`slide ${index + 1}`} />
    ))}
  </div>
</div>

      </div>

      {/* KEY FEATURES */}
      <h2 className="homes-section-header">Key Features</h2>
      <div className="key-features-container">
        <div className="key-feature-card">
          <img src="https://cdn-icons-png.flaticon.com/512/854/854878.png" alt="geo" />
          <h3>Geographic Location</h3>
          <p>Realtime location mapping — easily locate pregnant users and view their location on the map.</p>
        </div>

        <div className="key-feature-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2318/2318736.png" alt="analytics" />
          <h3>Pregnant Analytics</h3>
          <p>Trimester distribution, growth charts, and monthly reports to identify pregnant women needing emergency response.</p>
        </div>

        <div className="key-feature-card">
          <img src="https://cdn-icons-png.flaticon.com/512/4847/4847033.png" alt="reports" />
          <h3>Generates Reports</h3>
          <p>Generate and download reports easily, including checkup histories and emergency details.</p>
        </div>

        <div className="key-feature-card">
          <img src="https://cdn-icons-png.flaticon.com/512/8123/8123645.png" alt="management" />
          <h3>Pregnant Management</h3>
          <p>Assign patients to BHWs, manage checkups and mark deliveries in one place.</p>
        </div>
      </div>

      {/* MAIN CONTENT (Cards Left, Image Grid Right - Option A layout) */}
      <h2 className="homes-image-grid-title">Barangay officials Roles and Responsibilites</h2>
      <div className="big-section">
        <div className="big-container">
          {/* LEFT SIDE – CARDS */}
          <div className="cards-left">
            <div className="home-card">
              <img src="https://cdn-icons-png.flaticon.com/512/5745/5745453.png" alt="location" />
              <div className="card-text">
                <h3>Midwife</h3>
                <p>Manages all pregnant users in the system, monitors their health, assigns pregnant women to Barangay Health Workers (BHWs), generates reports to track progress, and oversees checkups especially when they reach their due week.</p>
              </div>
            </div>

            <div className="home-card">
              <img src="https://cdn-icons-png.flaticon.com/512/4326/4326606.png" alt="analytics" />
              <div className="card-text">
                <h3>Barangay Health Worker (BHW)</h3>
                <p>Receives assignments from the midwife, monitors the health of assigned pregnant women, records and updates checkup information, sends messages or reminders about pregnancy care, and assists the midwife in following up with patients.</p>
              </div>
            </div>

            <div className="home-card">
              <img src="https://cdn-icons-png.flaticon.com/512/4325/4325961.png" alt="report" />
              <div className="card-text">
                <h3>Barangay Rescuer</h3>
                <p>Provides immediate assistance to pregnant women during emergencies or labor, notifies the midwife and BHW when a pregnant woman delivers at a hospital or health center, and ensures timely medical support and safe transport if needed.</p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE – IMAGE GRID (Option A: 2 portraits top, 1 landscape bottom) */}
          <div className="image-grid-container">
            <div className="image-grid">
              <img src="/bhwRole.png" alt="portrait1" className="grid-img portrait" />
              <img src="/rescuerRole.png" alt="portrait2" className="grid-img portrait" />
              <img src="/midwifeRole.png" alt="landscape1" className="grid-img landscape" />
            </div>
          </div>
        </div>
      </div>

      {/* WHAT PALMS MEANS */}
      <h2 className="homes-section-header">What PALMS Means</h2>
      <div className="palms-cards-wrapper">
        <div className="palms-card">
          <div className="letter-circle">P</div>
          <div>
            <h4>Pregnant</h4>
            <p>Focus on pregnant mothers in the Barangay Mapaya community.</p>
          </div>
        </div>

        <div className="palms-card">
          <div className="letter-circle">A</div>
          <div>
            <h4>Active</h4>
            <p>Realtime tracking and alerts for active Pregnant location.</p>
          </div>
        </div>

        <div className="palms-card">
          <div className="letter-circle">L</div>
          <div>
            <h4>Location</h4>
            <p>Visual mapping of Pregnant location.</p>
          </div>
        </div>

        <div className="palms-card">
          <div className="letter-circle">M</div>
          <div>
            <h4>Mapping</h4>
            <p>Coordinate resources using maps and routes.</p>
          </div>
        </div>

        <div className="palms-card">
          <div className="letter-circle">S</div>
          <div>
            <h4>System</h4>
            <p>A centralized system for Barangay Mapaya community health.</p>
          </div>
        </div>
      </div>

    </section>
  );
}
