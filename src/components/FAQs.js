import React from "react";
import "./FAQs.css";

export default function FAQs() {
  const faqs = [
    { q: "What is PALMS?", a: "PALMS is a system for tracking maternal health at the community level." },
    { q: "Who can use it?", a: "Admins and Barangay Health Workers can access PALMS." },
    { q: "Is data secure?", a: "Yes, all data is encrypted and only accessible to authorized users." },
  ];

  return (
    <section className="faqs-section">
      <h1>Frequently Asked Questions</h1>
      <div className="faqs-list">
        {faqs.map((faq, idx) => (
          <div className="faq-item" key={idx}>
            <h3>{faq.q}</h3>
            <p>{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
