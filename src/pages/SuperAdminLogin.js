import React, { useState } from "react";
import "./SuperAdminLogin.css";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      // 1️⃣ Check if email exists in super_admin_users
      const q = query(
        collection(db, "super_admin_users"),
        where("email", "==", email)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Email not in super_admin_users
        setError("You don’t have an account to Super Admin");
        return;
      }

      // 2️⃣ Email exists → try to login with Firebase Auth
      try {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/SuperAdminPage");
      } catch (authError) {
        // Wrong password
        setError("Wrong password");
      }
    } catch (err) {
      setError("Something went wrong. Try again.");
      console.error(err);
    }
  };

  return (
    <div className="super-admin-login-container">
      <div className="super-admin-login-box">
        <h2 className="super-admin-title">Super Admin Login</h2>

        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Super Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="super-admin-input"
            required
          />

          <div className="input-with-icon">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="super-admin-input"
              required
            />
            <span
              className="material-icons eye-icon"
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: "pointer" }}
            >
              {showPassword ? "visibility" : "visibility_off"}
            </span>
          </div>

          <button type="submit" className="super-admin-btn">
            Login
          </button>
        </form>

        <p
          className="back-to-admin"
          onClick={() => navigate("/login")}
        >
          ← Back to Admin Login
        </p>
      </div>
    </div>
  );
}
