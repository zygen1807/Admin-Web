// LandingPage.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase"; // ✅ make sure this path matches your firebase config file
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();

  // UI state
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Signup form state
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [signupErrors, setSignupErrors] = useState({});
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  // Login form state
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");

  // Scroll animations
  const featuresRef = useRef(null);
  const palmsRef = useRef(null);
  const aboutRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          if (ent.isIntersecting) ent.target.classList.add("reveal-visible");
        });
      },
      { threshold: 0.12 }
    );
    [featuresRef.current, palmsRef.current, aboutRef.current].forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // -------------------- VALIDATION --------------------
  const validateSignup = () => {
    const errs = {};
    const { name, number, email, password } = signupForm;

    if (!name.trim()) errs.name = "Name is required";
    else if (!/^[A-Za-z\s]{2,}$/.test(name))
      errs.name = "At least 2 letters only";

    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Invalid email";

    if (!password.trim()) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "Min 6 characters";
    else if (!/\d/.test(password))
      errs.password = "Password must contain at least one number";

    return errs;
  };

  // -------------------- SIGNUP --------------------
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const errs = validateSignup();
    setSignupErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const { email, password, name, number } = signupForm;
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "admins", userCred.user.uid), { name, number, email });
      await sendEmailVerification(userCred.user);

      setVerificationSent(true);
      setVerificationMessage("Verification email sent! Please check your inbox.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Signup failed");
    }
  };

  // -------------------- LOGIN --------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const userCred = await signInWithEmailAndPassword(
        auth,
        loginForm.email,
        loginForm.password
      );

      if (!userCred.user.emailVerified) {
        setLoginError("Please verify your email before logging in.");
        return;
      }

      // success — navigate to dashboard
      navigate("/app/dashboard");
      setShowLogin(false);
    } catch (err) {
      console.error(err);
      setLoginError(err.message || "Invalid credentials");
    }
  };

  // Lock scroll when modal open
  useEffect(() => {
    const locked = showLogin || showSignup;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [showLogin, showSignup]);

  const ICONS = {
    location: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
    analytics: "https://cdn-icons-png.flaticon.com/512/2318/2318736.png",
    report: "https://cdn-icons-png.flaticon.com/512/4847/4847033.png",
    manage: "https://cdn-icons-png.flaticon.com/512/8123/8123466.png",
    palmsBadge: "logo_round.png",
  };

  // -------------------- UI --------------------
  return (
    <div className="lp-root">
      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-logo-row">
            <img src={ICONS.palmsBadge} alt="PALMS" className="lp-logo" />
            <div>
              <div className="app-name">PALMS</div>
              <div className="app-sub">
                Pregnancy Active Location Mapping System
              </div>
            </div>
          </div>
     
        </div>
      </header>

      {/* Hero */}
      <main className="lp-main">
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Monitor & Manage — <span className="accent">Maternal Care</span> with PALMS
            </h1>
            <p className="hero-sub">
              A lightweight Admin dashboard to assign Barangay Health Workers, monitor active pregnant users' locations,
              and coordinate emergency responses — built for community health.
            </p>
            <div className="hero-cta">
              
             <button
        className="btn-gradient"
        onClick={() => navigate("/login")} // 👈 redirects to Login.js
      >
        Get Started
      </button>
            </div>
          </div>

          <div className="hero-art">
            {/* big circular badge */}
            <div className="hero-badge">
              <img src={ICONS.location} alt="map" />
            </div>
            <div className="hero-stat">
              <div className="stat-value">24/7</div>
              <div className="stat-label">Real-time Monitoring</div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="features reveal" ref={featuresRef}>
          <h2 className="section-title">Key Features</h2>
          <div className="cards">
            <article className="card">
              <img src={ICONS.location} alt="geo" />
              <h3>Geographic Location</h3>
              <p>Realtime location mapping — easily locate pregnant users and view their location on the map.</p>
            </article>

            <article className="card">
              <img src={ICONS.analytics} alt="analytics" />
              <h3>Pregnant Analytics</h3>
              <p>Trimester distribution, growth charts, and monthly reports to identify pregnant women needing emergency response.</p>
            </article>

            <article className="card">
              <img src={ICONS.report} alt="report" />
              <h3>Generates Reports</h3>
              <p>Generate and download reports easily, including checkup histories and emergency details.</p>
            </article>

            <article className="card">
              <img src={ICONS.manage} alt="manage" />
              <h3>Pregnant Management</h3>
              <p>Assign patients to BHWs, manage checkups and mark deliveries in one place.</p>
            </article>
          </div>
        </section>

        {/* Meaning of PALMS */}
        <section className="palms-section reveal" ref={palmsRef}>
          <h2 className="section-title">What PALMS Means</h2>
          <div className="meaning-cards">
            <div className="meaning-card">
              <div className="letter">P</div>
              <div><strong>Pregnant</strong><p>Focus on pregnant mothers in the community.</p></div>
            </div>
            <div className="meaning-card">
              <div className="letter">A</div>
              <div><strong>Active</strong><p>Realtime tracking and alerts for active cases.</p></div>
            </div>
            <div className="meaning-card">
              <div className="letter">L</div>
              <div><strong>Location</strong><p>Visual mapping of patients and responders.</p></div>
            </div>
            <div className="meaning-card">
              <div className="letter">M</div>
              <div><strong>Mapping</strong><p>Coordinate resources using maps and routes.</p></div>
            </div>
            <div className="meaning-card">
              <div className="letter">S</div>
              <div><strong>System</strong><p>A centralized dashboard for community health.</p></div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="about reveal" ref={aboutRef}>
          <h2 className="section-title">About PALMS</h2>
          <div className="about-inner">
            <div className="about-text">
              <p>
                PALMS helps Barangay Health Workers and Admins to coordinate maternal care at the community level.
                It is designed to reduce response times, keep accurate records of checkups and deliveries,
                and to provide simple analytics for planning and outreach.
              </p>
              <ul className="about-list">
                <li>Assign pregnant users to BHWs</li>
                <li>Realtime emergency alerts & routing</li>
                <li>Trimester dashboards & monthly reports</li>
              </ul>
            </div>
         
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>© {new Date().getFullYear()} PALMS — All rights reserved.</div>
         
        </div>
      </footer>

  {/* ---------------- LOGIN MODAL ---------------- */}
      {showLogin && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <img
                src="/logo_round.png"
                alt="PALMS"
                className="modal-logo"
                onError={(e) => (e.currentTarget.src = ICONS.palmsBadge)}
              />
              <h3>Admin Login</h3>
            </div>

            <form onSubmit={handleLoginSubmit} className="modal-form">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, email: e.target.value })
                }
                required
              />

              <label>Password</label>
              <div className="input-icon-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  required
                />
                <i
                  className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                  onClick={() => setShowPassword(!showPassword)}
                ></i>
              </div>

              {loginError && <div className="form-error">{loginError}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setShowLogin(false);
                    setShowSignup(true);
                  }}
                >
                  Register
                </button>
                <button type="submit" className="btn-gradient">
                  Login
                </button>
              </div>
            </form>

            <button className="modal-close" onClick={() => setShowLogin(false)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ---------------- SIGNUP MODAL ---------------- */}
      {showSignup && (
        <div className="modal-backdrop" onClick={() => setShowSignup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <img
                src="/logo_round.png"
                alt="PALMS"
                className="modal-logo"
                onError={(e) => (e.currentTarget.src = ICONS.palmsBadge)}
              />
              <h3>Create Admin Account</h3>
            </div>

            {!verificationSent ? (
              <form onSubmit={handleSignupSubmit} className="modal-form">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={signupForm.name}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, name: e.target.value })
                  }
                  className={signupErrors.name ? "input-error" : ""}
                />
                {signupErrors.name && (
                  <div className="form-error">{signupErrors.name}</div>
                )}

                <label>Phone</label>
                <input
                  type="tel"
                  placeholder="63+"
                  value={signupForm.number}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, number: e.target.value })
                  }
                  className={signupErrors.number ? "input-error" : ""}
                />
                {signupErrors.number && (
                  <div className="form-error">{signupErrors.number}</div>
                )}

                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter email"
                  value={signupForm.email}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, email: e.target.value })
                  }
                  className={signupErrors.email ? "input-error" : ""}
                />
                {signupErrors.email && (
                  <div className="form-error">{signupErrors.email}</div>
                )}

                <label>Password</label>
                <div className="input-icon-wrapper">
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={signupForm.password}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, password: e.target.value })
                    }
                    className={signupErrors.password ? "input-error" : ""}
                  />
                  <i
                    className={`fas ${
                      showSignupPassword ? "fa-eye-slash" : "fa-eye"
                    }`}
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                  ></i>
                </div>
                {signupErrors.password && (
                  <div className="form-error">{signupErrors.password}</div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setShowSignup(false);
                      setShowLogin(true);
                    }}
                  >
                    Back to Login
                  </button>
                  <button type="submit" className="btn-gradient">
                    Create Account
                  </button>
                </div>
              </form>
            ) : (
              <div className="verification-message">
                <p>{verificationMessage}</p>
                <button
                  className="btn-gradient"
                  onClick={() => setShowSignup(false)}
                >
                  Done
                </button>
              </div>
            )}

            <button className="modal-close" onClick={() => setShowSignup(false)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
