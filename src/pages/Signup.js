import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import "./Auth.css";

function Signup() {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [birthday, setBirthday] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [errors, setErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const navigate = useNavigate();

  // Validation
  const validate = () => {
    const newErrors = {};

    if (!name.trim()) newErrors.name = "Name is required";
    else if (!/^[A-Za-z\s]{2,}$/.test(name))
      newErrors.name = "At least 2 letters only";

    if (!number.trim()) newErrors.number = "Number is required";
    else if (!/^\d{10,}$/.test(number))
      newErrors.number = "Must be at least 10 digits";

    if (!birthday.trim()) newErrors.birthday = "Birthday is required";

    if (!address.trim()) newErrors.address = "Address is required";

    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email";

    if (!password.trim()) newErrors.password = "Password is required";
    else if (password.length < 6)
      newErrors.password = "At least 6 characters";
    else if (!/\d/.test(password))
      newErrors.password = "Must contain at least one number";

    if (!confirmPass.trim())
      newErrors.confirmPass = "Confirm your password";
    else if (confirmPass !== password)
      newErrors.confirmPass = "Passwords do not match";

    return newErrors;
  };

  const handleSignup = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Save to Firestore
      await setDoc(doc(db, "admin_users", userCredential.user.uid), {
        name,
        number,
        birthday,
        address,
        email,
      });

      // SHOW SUCCESS MODAL
      setShowSuccessModal(true);

    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="login-page">
      <div className="signup-container">
        {/* Welcome Message */}
        <div className="signup-welcome">
          <h2>Register Your Account</h2>
          <p>Signup to manage maternal care in Brgy. Mapaya, San Jose efficiently.</p>
        </div>

        {/* FORM */}
        <div className="form-container">
          <>
            {/* NAME */}
            <div className="input-group">
              <label>Name</label>
              <div className="input-with-icon">
                <span className="material-icons">person</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  style={errors.name ? { borderColor: "red" } : {}}
                />
              </div>
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            {/* NUMBER */}
            <div className="input-group">
              <label>Number</label>
              <div className="input-with-icon">
                <span className="material-icons">call</span>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="63+"
                  style={errors.number ? { borderColor: "red" } : {}}
                />
              </div>
              {errors.number && <span className="error-text">{errors.number}</span>}
            </div>

            {/* BIRTHDAY */}
            <div className="input-group">
              <label>Birthday</label>
              <div className="input-with-icon">
                <span className="material-icons">cake</span>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  style={errors.birthday ? { borderColor: "red" } : {}}
                />
              </div>
              {errors.birthday && (
                <span className="error-text">{errors.birthday}</span>
              )}
            </div>

            {/* ADDRESS */}
            <div className="input-group">
              <label>Address</label>
              <div className="input-with-icon">
                <span className="material-icons">home</span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House No. / Street / Barangay"
                  style={errors.address ? { borderColor: "red" } : {}}
                />
              </div>
              {errors.address && (
                <span className="error-text">{errors.address}</span>
              )}
            </div>

            {/* EMAIL */}
            <div className="input-group">
              <label>Email</label>
              <div className="input-with-icon">
                <span className="material-icons">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  style={errors.email ? { borderColor: "red" } : {}}
                />
              </div>
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            {/* PASSWORD */}
            <div className="input-group">
              <label>Password</label>
              <div className="input-with-icon">
                <span className="material-icons">lock</span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  style={errors.password ? { borderColor: "red" } : {}}
                />
                <span
                  className="material-icons eye-icon"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? "visibility" : "visibility_off"}
                </span>
              </div>
              {errors.password && (
                <span className="error-text">{errors.password}</span>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="input-group">
              <label>Confirm Password</label>
              <div className="input-with-icon">
                <span className="material-icons">lock</span>
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="********"
                  style={errors.confirmPass ? { borderColor: "red" } : {}}
                />
                <span
                  className="material-icons eye-icon"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                >
                  {showConfirmPass ? "visibility" : "visibility_off"}
                </span>
              </div>
              {errors.confirmPass && (
                <span className="error-text">{errors.confirmPass}</span>
              )}
            </div>

            <button className="auth-button" onClick={handleSignup}>
              SIGN UP
            </button>

            <p className="footer-text">
              Already have an account?{" "}
              <span onClick={() => navigate("/login")} className="link">
                LOGIN
              </span>
            </p>
          </>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <span className="material-icons success-icon">check_circle</span>
            <h3>Successfully Registered!</h3>
            <p>You may now login to your account.</p>

            <button
              className="auth-button"
              onClick={() => navigate("/login")}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Signup;
