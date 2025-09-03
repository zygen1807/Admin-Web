import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import './Auth.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/app/dashboard');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Logo */}
        <img src="./logo_round.png" alt="Logo" className="logo" />

        <div className="input-group">
          <label>Email</label>
          <div className="input-with-icon">
            <span className="material-icons">mail</span>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="example@gmail.com" 
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
            />
          </div>
        </div>

        <button className="auth-button" onClick={handleLogin}>LOGIN</button>
        <p className="footer-text">
          Don't have an account? 
          <span onClick={() => navigate('/signup')} className="link"> SIGNUP</span>
        </p>
      </div>
    </div>
  );
}

export default Login;
