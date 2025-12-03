import React from "react";
import "./About.css";

export default function About() {
  return (
    <section className="about-section">

      {/* HEADER */}
      <div className="home-header">
  <h1>
    <span className="highlight">PALMS:</span> About Us
  </h1>
  <p className="home-subtitle">
   PALMS simplifies maternal health management by giving health workers, midwives, and responders centralized tools for reporting, monitoring, and supporting pregnant women effectively.
  </p>
</div>


      {/* OUR VISION & MISSION */}
      <h2 className="section-header">Our Vision & Mission</h2>
      <div className="two-card-container">
        <div className="two-card">
          <img src="logo_round.png" alt="vision icon" />
          <h3>Vision</h3>
          <p>To empower maternal care in the community with real-time monitoring and efficient health services.</p>
        </div>
        <div className="two-card">
          <img src="https://cdn-icons-png.flaticon.com/512/5165/5165942.png" alt="mission icon" />
          <h3>Mission</h3>
          <p>To provide Barangay Health Workers and responders with tools to track, report, and support pregnant women effectively.</p>
        </div>
      </div>

      {/* CORE VALUES */}
      <h2 className="section-header">Our Core Values</h2>
      <div className="core-values-container">
        <div className="core-value-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910753.png" alt="compassion" />
          <h3>Compassion</h3>
          <p>We care for every mother and child in the community.</p>
        </div>
        <div className="core-value-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910749.png" alt="integrity" />
          <h3>Integrity</h3>
          <p>Honest and transparent practices in maternal care management.</p>
        </div>
        <div className="core-value-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910738.png" alt="teamwork" />
          <h3>Teamwork</h3>
          <p>Collaborative approach between BHWs, rescuers, and community members.</p>
        </div>
        <div className="core-value-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910726.png" alt="innovation" />
          <h3>Innovation</h3>
          <p>Leveraging technology to improve maternal care and emergency response.</p>
        </div>
      </div>

      {/* BARANGAY OFFICIALS */}
      <h2 className="section-header">Barangay Officials</h2>

      {/* Rural Health Midwife */}
      <h3 className="sub-header">Rural Health Midwife</h3>
      <div className="official-cards-box">
        <div className="official-card-box">
          <img src="https://cdn-icons-png.flaticon.com/512/3135/3135823.png" alt="profile" />
          <h4>Cherry Anne Balmes</h4>
          <p>Rural Health Midwife</p>
        </div>
      </div>

     {/* BHW Coordinator */}
<h3 className="sub-header">BHW Coordinator</h3>
<div className="official-cards-box">
  <div className="official-card-box">
    <img
      src="https://cdn-icons-png.flaticon.com/512/3135/3135823.png"
      alt="profile"
    />
    <h4>Emelyn Gabao</h4>
    <p>BHW Coordinator</p>
  </div>
</div>


{/* Barangay Health Workers */}
<h3 className="sub-header">Barangay Health Workers</h3>
<div className="official-cards-box">
  {[
    { name: "Ana Cruz", gender: "female" },
    { name: "kyla Lopez", gender: "female" },
    { name: "Carla Diaz", gender: "female" },
    { name: "Dan De Lara", gender: "female" },
    { name: "Ella Reyes", gender: "female" },
  ].map((bhw, i) => {
    const profileIcon =
      bhw.gender === "male"
        ? "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
        : "https://cdn-icons-png.flaticon.com/512/3135/3135823.png";

    return (
      <div key={i} className="official-card-box">
        <img src={profileIcon} alt="profile" />
        <h4>{bhw.name}</h4>
        <p>Barangay Health Worker</p>
      </div>
    );
  })}
</div>

{/* Barangay Rescuers */}
<h3 className="sub-header">Barangay Rescuers</h3>
<div className="official-cards-box">
  {[
    { name: "Rico Santos", gender: "male" },
    { name: "Mia Lopez", gender: "female" },
    { name: "Leo Cruz", gender: "male" },
    { name: "Tina Reyes", gender: "female" },
    { name: "Mark Diaz", gender: "male" },
  ].map((rescue, i) => {
    const profileIcon =
      rescue.gender === "male"
        ? "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
        : "https://cdn-icons-png.flaticon.com/512/3135/3135823.png";

    return (
      <div key={i} className="official-card-box">
        <img src={profileIcon} alt="profile" />
        <h4>{rescue.name}</h4>
        <p>Barangay Rescuer</p>
      </div>
    );
  })}
</div>

    </section>
  );
}
