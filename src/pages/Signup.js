import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import './Auth.css';

function Signup() {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // Simple validation function
  const validate = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[A-Za-z\s]{2,}$/.test(name)) {
      newErrors.name = 'Name must be at least 2 letters and contain only letters and spaces';
    }

    if (!number.trim()) {
      newErrors.number = 'Number is required';
    } else if (!/^\d{10,}$/.test(number)) {
      newErrors.number = 'Number must be at least 10 digits';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email is not valid';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/\d/.test(password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    return newErrors;
  };

  const handleSignup = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'admins', userCredential.user.uid), {
        name,
        number,
        email
      });
      await sendEmailVerification(userCredential.user);
      setVerificationSent(true);
    } catch (error) {
      alert(error.message);
    }
  };

  // Simulate verification code check (replace with actual logic if needed)
  const handleVerifyCode = () => {
    if (verificationCode === '123456') { // Example code
      navigate('/login');
    } else {
      setErrors({ verificationCode: 'Invalid verification code' });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (verificationSent) {
        handleVerifyCode();
      } else {
        handleSignup();
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <img src="./logo_round.png" alt="Logo" className="logo" />
        <h2>SIGN UP</h2>
        {!verificationSent ? (
          <>
            <div className="input-group">
              <label>Name</label>
              <div className="input-with-icon">
                <span className="material-icons">person</span>
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={errors.name ? { borderColor: 'red' } : {}}
                />
              </div>
              {errors.name && <span style={{ color: 'red', fontSize: '12px' }}>{errors.name}</span>}
            </div>
            <div className="input-group">
              <label>Number</label>
              <div className="input-with-icon">
                <span className="material-icons">call</span>
                <input
                  type="text"
                  placeholder="63+"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={errors.number ? { borderColor: 'red' } : {}}
                />
              </div>
              {errors.number && <span style={{ color: 'red', fontSize: '12px' }}>{errors.number}</span>}
            </div>
            <div className="input-group">
              <label>Email</label>
              <div className="input-with-icon">
                <span className="material-icons">mail</span>
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={errors.email ? { borderColor: 'red' } : {}}
                />
              </div>
              {errors.email && <span style={{ color: 'red', fontSize: '12px' }}>{errors.email}</span>}
            </div>
            <div className="input-group">
              <label>Password</label>
              <div className="input-with-icon">
                <span className="material-icons">lock</span>
                <input
                  type="password"
                  placeholder="****************"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={errors.password ? { borderColor: 'red' } : {}}
                />
              </div>
              {errors.password && <span style={{ color: 'red', fontSize: '12px' }}>{errors.password}</span>}
            </div>
            <button className="auth-button" onClick={handleSignup}>SIGN UP</button>
            <p className="footer-text">
              Already have an account?{' '}
              <span onClick={() => navigate('/login')} className="link">LOGIN</span>
            </p>
          </>
        ) : (
          <>
            <div className="input-group">
              <label>Enter Verification Code (Check your email)</label>
              <input
                type="text"
                placeholder="Verification Code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                onKeyDown={handleKeyDown}
                style={errors.verificationCode ? { borderColor: 'red' } : {}}
              />
              {errors.verificationCode && <span style={{ color: 'red', fontSize: '12px' }}>{errors.verificationCode}</span>}
            </div>
            <button className="auth-button" onClick={handleVerifyCode}>Verify</button>
          </>
        )}
      </div>
    </div>
  );
}

export default Signup;