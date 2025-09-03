import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import './Auth.css';

function Signup() {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'admins', userCredential.user.uid), {
        name,
        number,
        email
      });
      navigate('/login');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Logo */}
        <img src="./logo_round.png" alt="Logo" className="logo" />
      <h2>SIGN UP</h2>
      <div className="input-group">
        <label>Name</label>
        <div className="input-with-icon">
          <span className="material-icons">person</span>
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="input-group">
        <label>Number</label>
        <div className="input-with-icon">
          <span className="material-icons">call</span>
          <input type="text" placeholder="63+" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
      </div>
      <div className="input-group">
        <label>Email</label>
        <div className="input-with-icon">
          <span className="material-icons">mail</span>
          <input type="email" placeholder="example@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="input-group">
        <label>Password</label>
        <div className="input-with-icon">
          <span className="material-icons">lock</span>
          <input type="password" placeholder="****************" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>
      <button className="auth-button" onClicks={handleSignup}>SIGN UP</button>
      <p className="footer-text">Already have an account? <span onClick={() => navigate('/login')} className="link">LOGIN</span></p>
    </div>
     </div>
  );
}

export default Signup;