import React from "react";
import "./Developer.css";

export default function Developer() {
  return (
    <section className="developer-section">

 {/* HEADER */}
      <div className="home-header">
        <h1>
          <span className="highlight">PALMS:</span> Developers
        </h1>
        <p className="home-subtitle">
          PALMS is developed by a team of students pursuing a Bachelor of Science in Information Technology, dedicated to creating a practical and user-friendly system that supports Barangay health officials in efficiently monitoring and managing maternal care in the Barangay Mapaya.
        </p>
      </div>

      {/* Section Header */}
      <h2 className="section-header">Our Developer Values</h2>
      <div className="developer-values">
        <div className="value-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910765.png" alt="quality" />
          <h3>Quality Code</h3>
          <p>We write clean, maintainable, and efficient code for all modules.</p>
        </div>
        <div className="value-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910740.png" alt="teamwork" />
          <h3>Teamwork</h3>
          <p>Collaboration and communication are at the core of our development.</p>
        </div>
        <div className="value-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910760.png" alt="innovation" />
          <h3>Innovation</h3>
          <p>We constantly explore new ideas and technologies to improve PALMS.</p>
        </div>
        <div className="value-card">
          <img src="https://cdn-icons-png.flaticon.com/512/2910/2910763.png" alt="commitment" />
          <h3>Commitment</h3>
          <p>Dedicated to delivering reliable and secure applications for the community.</p>
        </div>
      </div>

      {/* Meet the Developers */}
      <h2 className="section-header">Meet the Developers</h2>
      <div className="developer-cards">
        {/* Developer 1 */}
        <div className="developer-card">
          <img src="allan.png" alt="dev1" />
          <h3>Allan Nocer</h3>
          <p>Data Analyst</p>
          <div className="dev-skills">
            <button><img src="https://cdn-icons-png.flaticon.com/512/4725/4725970.png" alt="js" />MS Word</button>
            <button><img src="https://cdn-icons-png.flaticon.com/512/4726/4726040.png" alt="react" />Excel</button>
            
          </div>
        </div>

        {/* Developer 2 */}
        <div className="developer-card">
          <img src="bry.png" alt="dev2" />
          <h3>Brylle Darren Ramos</h3>
          <p>UI/UX Designer</p>
          <div className="dev-skills">
            <button><img src="https://cdn-icons-png.flaticon.com/512/5968/5968705.png" alt="js" /> Figma</button>
            <button><img src="https://cdn-icons-png.flaticon.com/512/5968/5968520.png" alt="react" /> Adobe Photoshop</button>
            
          </div>
        </div>

        {/* Developer 3 */}
        <div className="developer-card">
          <img src="Ed.png" alt="dev3" />
          <h3>Edgie Boy Curameng</h3>
          <p>Programmer</p>
          <div className="dev-skills">
            <button><img src="https://cdn-icons-png.flaticon.com/512/226/226777.png" alt="js" /> JavaScript</button>
            <button><img src="https://cdn-icons-png.flaticon.com/512/919/919851.png" alt="react" /> React Native</button>
            <button><img src="https://cdn-icons-png.flaticon.com/512/657/657695.png" alt="firebase" /> Firebase</button>
          </div>
        </div>

        {/* Developer 4 */}
        <div className="developer-card">
          <img src="arjay.png" alt="dev4" />
          <h3>Arjay Agliones</h3>
          <p>Documentation</p>
          <div className="dev-skills">
            <button><img src="https://cdn-icons-png.flaticon.com/512/4726/4726040.png" alt="react" />Excel</button>
            <button><img src="https://cdn-icons-png.flaticon.com/512/4725/4725970.png" alt="js" />MS Word</button>
           
          </div>
        </div>

        {/* Developer 5 */}
        <div className="developer-card">
          <img src="ceejay.png" alt="dev5" />
          <h3>Cee-jay Ray Leido</h3>
          <p>Documentation</p>
          <div className="dev-skills">
            <button><img src="https://cdn-icons-png.flaticon.com/512/4725/4725970.png" alt="js" />MS Word</button>
            <button><img src="https://cdn-icons-png.flaticon.com/512/16758/16758081.png" alt="react" />Canva</button>
           
          </div>
        </div>
      </div>
    </section>
  );
}
