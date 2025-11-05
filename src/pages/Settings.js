import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';

import styles from './Settings.module.css';
import {
  FaUserCircle, FaEnvelope, FaPhoneAlt,
  FaBell, FaSms, FaShieldAlt, FaLock, FaSave, FaArrowRight
} from 'react-icons/fa';

const Settings = () => {
  const [profile, setProfile] = useState({ name: '', email: '', number: '' });
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'admins', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
      }
    });

    return () => unsubscribe();
  }, []);

 const handleSave = async () => {
  const confirmed = window.confirm('Are you sure you want to save changes?');
  if (!confirmed) return;

  // If one password field is filled, all must be filled
  const anyPasswordFilled = currentPassword || newPassword || confirmNewPassword;
  const allPasswordFilled = currentPassword && newPassword && confirmNewPassword;

  if (anyPasswordFilled && !allPasswordFilled) {
    alert("Please complete all password fields.");
    return;
  }

  if (allPasswordFilled) {
    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      alert("New passwords do not match.");
      return;
    }

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      alert("Password updated successfully.");

      // Clear fields after successful update
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error(error);
      alert("Error updating password: " + error.message);
      return;
    }
  }

  
};


  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
      <h1>Account Settings</h1>

      {/* Profile Info */}
      <div className={styles.card}>
        <h2>Profile Information</h2>
        <div className={styles.profileInfo}>
          <FaUserCircle className={styles.avatar} />
          <div className={styles.profileText}>
            <p><strong>Full Name:</strong> {profile.name}</p>
            <p><strong>Administrator</strong></p>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className={styles.card}>
        <h2>Contact Information</h2>
        <div className={styles.contact}>
          <p><FaEnvelope /> {profile.email}</p>
          <p><FaPhoneAlt /> {profile.number}</p>
        </div>
      </div>


      {/* Security Settings */}
      <div className={styles.card}>
        <h2>Security Settings</h2>
        <div className={styles.security}>
          <div
            className={styles.securityClickable}
            onClick={() => setShowPasswordModal(true)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0' }}
          >
            <span><FaLock /> Change Password</span>
            <FaArrowRight />
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Change Password</h3>
            <div className={styles.passwordFields}>
              <label>
                <span><FaLock /> Current Password</span>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </label>
              <label>
                <span><FaLock /> New Password</span>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
              <label>
                <span><FaLock /> Confirm New Password</span>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </label>
            </div>
            <div className={styles.saveContainer}>
              <button className={styles.saveButton} onClick={handleSave}>
                <FaSave /> Save Changes
              </button>
              <button className={styles.cancelButton} onClick={() => setShowPasswordModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Settings;
