import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import "./Auth.css";

// ✅ Use your own background image
import pregnantImage from "../assets/pregnant-BG.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app/dashboard");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Section: Image + Welcome Text */}
        <div className="left-section">
          {/* ✅ Your own image */}
          <img src={pregnantImage} alt="Pregnant Background" className="doctor-image" />
          <div className="welcome-box">
            <h2>Welcome to PALMS</h2>
            <p>Login to continue managing the Barangay Health System.</p>
          </div>
        </div>

        {/* Right Section: Login Form */}
        <div className="right-section">
          <div className="form-container">
            <h2>Sign In</h2>

            <div className="input-group">
              <label>Email</label>
              <div className="input-with-icon">
                <span className="material-icons">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-with-icon">
                <span className="material-icons">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            <button className="auth-button" onClick={handleLogin}>
              LOGIN
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
