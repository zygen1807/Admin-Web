import React from "react";
import "./Services.css";

export default function Services() {
  return (
    <section className="services-section">
      {/* HEADER */}
      <div className="home-header">
        <h1>
          <span className="highlight">PALMS:</span> Services
        </h1>
        <p className="home-subtitle">
          PALMS streamlines maternal care by enabling midwives to manage and monitor pregnancies, BHWs to record and track checkups, and responders to provide immediate assistance during emergencies. It ensures timely coordination, accurate reporting, and efficient support for every expectant mother in the Barangay Mapaya.
        </p>
      </div>

      {/* KEY SERVICES CARDS */}
      <h2 className="section-header">Our Services</h2>
      <div className="services-cards">
        <div className="service-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910765.png" alt="assign" />
          <h3>Assign BHWs</h3>
          <p>Efficiently assign pregnant users to Barangay Health Workers.</p>
        </div>

        <div className="service-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910740.png" alt="emergency" />
          <h3>Emergency Alerts</h3>
          <p>Realtime alerts for emergencies with routing to responders.</p>
        </div>

        <div className="service-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910760.png" alt="analytics" />
          <h3>Trimester Analytics</h3>
          <p>Visual dashboards to track pregnant users and monthly reports.</p>
        </div>

        <div className="service-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910762.png" alt="location" />
          <h3>Location Tracking</h3>
          <p>Monitor real-time locations of pregnant users and BHWs on the map.</p>
        </div>
      </div>

      {/* HOW PALMS WORKS SECTION */}
      <h2 className="section-header">How PALMS Works</h2>
      <p className="sub-header">A simple 4-step process for maternal care in your barangay</p>

      <div className="works-cards">
        <div className="work-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910739.png" alt="request" />
          <h3>Request</h3>
          <p>Pregnant users submit requests or report emergencies via PALMS.</p>
        </div>

        <div className="work-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910744.png" alt="monitor" />
          <h3>Monitor</h3>
          <p>Admin and BHWs monitor checkups and emergencies risk status in real-time.</p>
        </div>

        <div className="work-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910761.png" alt="respond" />
          <h3>Respond</h3>
          <p>Responders are notified immediately for emergency intervention and assistance.</p>
        </div>

        <div className="work-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910750.png" alt="delivered" />
          <h3>Delivered</h3>
          <p>Checkup or emergency response is completed and confirmed as delivered.</p>
        </div>
      </div>
    </section>
  );
}
