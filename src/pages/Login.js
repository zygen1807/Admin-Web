import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { collection, query, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Auth.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👁 Toggle Password

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showSuccessResetModal, setShowSuccessResetModal] = useState(false);

  const [accessKey, setAccessKey] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [adminKeyError, setAdminKeyError] = useState(""); // ❌ Admin Key Error
  const [showAdminSuccess, setShowAdminSuccess] = useState(false); // 🎉 Success Modal

  const navigate = useNavigate();
  const loginEmailRef = useRef(null);

  // ---------------- LOGIN ----------------
  const handleLogin = async () => {
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter email and password.");
      return;
    }

    try {
      // 🔍 CHECK IF EMAIL EXISTS IN admin_users
      const q = query(collection(db, "admin_users"));
      const querySnapshot = await getDocs(q);
      const adminExists = querySnapshot.docs.some(
        (doc) => doc.data().email === email
      );

      if (!adminExists) {
        setErrorMessage("You don’t have an account for Administration.");
        return;
      }

      // ✔ Continue login with Firebase Auth
      try {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/app/dashboard");
      } catch (authError) {
        setErrorMessage("Wrong email or password.");
      }
    } catch (error) {
      setErrorMessage("Something went wrong. Try again.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  // ---------------- FORGOT PASSWORD ----------------
  const handleForgotSubmit = async () => {
    if (!forgotEmail) return alert("Enter your email");

    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setShowForgotModal(false);
      setShowSuccessResetModal(true);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRememberLoginClick = () => {
    setShowForgotModal(false);

    if (forgotEmail) setEmail(forgotEmail);

    setTimeout(() => {
      if (loginEmailRef.current) loginEmailRef.current.focus();
    }, 0);
  };

  // ---------------- ADMIN KEY SUBMIT ----------------
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
      const data = doc.data();

      if (data?.key && data.key.trim() === accessKey.trim()) {
        matched = true;
      }
    });

    if (!matched) {
      setAdminKeyError("Wrong Admin Access Key");
      return;
    }

    // SUCCESS!
    setShowAdminModal(false);
    setShowAdminSuccess(true);

  } catch (err) {
    console.log("🔥 FIRESTORE ERROR:", err);
    setAdminKeyError("Error reading access key.");
  }
};



  return (
    <div className="login-page">
      <div className="signup-container">
        <div className="signup-welcome">
          <h2>Sign In</h2>
          <p>Login to continue managing the Barangay Health System.</p>
        </div>

        <div className="form-container">
          {/* ERROR MESSAGE */}
          {errorMessage && (
            <p className="error-text" style={{ textAlign: "center" }}>
              {errorMessage}
            </p>
          )}

          {/* EMAIL */}
          <div className="input-group">
            <label>Email</label>
            <div className="input-with-icon">
              <span className="material-icons">mail</span>
              <input
                ref={loginEmailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="input-group">
            <label>Password</label>
            <div className="input-with-icon">
              <span className="material-icons">lock</span>

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="********"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              {/* 👁 Eye Icon */}
              <span
                className="material-icons eye-icon"
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: "pointer" }}
              >
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </div>
          </div>

          {/* LOGIN BUTTON */}
          <button className="auth-button" onClick={handleLogin}>
            LOGIN
          </button>

          {/* FORGOT PASSWORD (adjusted position) */}
          <p
            className="footer-text link"
            style={{ textAlign: "right", marginTop: "5px" }}
            onClick={() => setShowForgotModal(true)}
          >
            Forgot Password?
          </p>

          {/* REGISTER */}
          <p className="footer-text">
            Don't have an account?{" "}
            <span className="link" onClick={() => setShowAdminModal(true)}>
              Register Account
            </span>
          </p>

          {/* Super Admin ACCESS */}
          <p
            className="super-admin-access"
            onClick={() => navigate("/SuperAdminLogin")}
          >
            Super Admin Access
          </p>
        </div>
      </div>

      {/* ---------- FORGOT PASSWORD MODAL ---------- */}
      {showForgotModal && (
        <div className="modal-overlay">
          <div className="forgot-modal-box">
            <h2>Forgot Password</h2>
            <p>Enter your email and we’ll send you a password reset link.</p>

            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="Email"
            />

            <button className="auth-button" onClick={handleForgotSubmit}>
              Send Reset Link
            </button>

            <p
              className="footer-text link"
              onClick={() => setShowForgotModal(false)}
            >
              Cancel
            </p>

            <p className="footer-text">
              Remember your password?{" "}
              <span
                onClick={handleRememberLoginClick}
                className="link"
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleRememberLoginClick()
                }
              >
                LOGIN
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ---------- SUCCESS RESET MODAL ---------- */}
      {showSuccessResetModal && (
        <div className="modal-overlay">
          <div className="success-reset-modal">
            <img
              src="https://cdn-icons-png.flaticon.com/512/845/845646.png"
              alt="success"
              className="success-icon"
            />

            <h2>Check Your Email</h2>

            <p>
              If an account with that email exists, we've sent you a password
              reset link.
            </p>

            <p className="small-text">
              Didn’t receive the email?{" "}
              <span className="link">Check your spam or try again.</span>
            </p>

            <button
              className="auth-button"
              onClick={() => {
                setShowSuccessResetModal(false);
                setShowForgotModal(true);
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ---------- Admin Access Modal ---------- */}
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

      {/* ---------- ADMIN KEY SUCCESS MODAL ---------- */}
      {showAdminSuccess && (
        <div className="modal-overlay">
          <div className="success-reset-modal">
            <img
              src="https://cdn-icons-png.flaticon.com/512/845/845646.png"
              alt="success"
              className="success-icon"
            />

            <h2>Access Granted</h2>

            <p>
              You successfully accessed the administration. You can now register
              your account.
            </p>

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

export default Login;
