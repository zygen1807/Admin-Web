import React from "react";
import "./ContactUs.css";

export default function ContactUs() {
  return (
    <section className="contact-section">
      <h1>Contact Us</h1>
      <p>Reach out for support or inquiries regarding PALMS.</p>

      <div className="contact-cards">
        <div className="contact-card">
          <img src="https://cdn-icons-png.flaticon.com/512/561/561127.png" alt="email" />
          <h3>Email</h3>
          <p>support@palms.com</p>
        </div>
        <div className="contact-card">
          <img src="https://cdn-icons-png.flaticon.com/512/483/483947.png" alt="phone" />
          <h3>Phone</h3>
          <p>+63 912 345 6789</p>
        </div>
        <div className="contact-card">
          <img src="https://cdn-icons-png.flaticon.com/512/684/684908.png" alt="location" />
          <h3>Address</h3>
          <p>Barangay Hall, City, Philippines</p>
        </div>
      </div>
    </section>
  );
}
