import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';

import styles from './Settings.module.css';
import {
  FaUserCircle,
  FaEnvelope,
  FaPhoneAlt,
  FaBirthdayCake,
  FaMapMarkerAlt,
  FaLock,
  FaSave,
  FaArrowRight,
  FaEdit,
} from 'react-icons/fa';

/**
 * Helper: format ISO date '2007-02-06' -> 'February 6, 2007'
 */
function formatBirthday(isoDateString) {
  if (!isoDateString) return '';
  try {
    const d = new Date(isoDateString);
    // options: Month day, year
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDateString;
  }
}

const Settings = () => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    number: '',
    birthday: '',
    address: '',
  });

  // UI states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // notification toggles (kept for UI — can persist later)
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  // password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // editable copy for Edit Profile modal
  const [editableProfile, setEditableProfile] = useState({
    name: '',
    email: '',
    number: '',
    birthday: '',
    address: '',
  });

  // Fetch current user profile from 'admin_user' collection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'admin_users', user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            // default values fallback
            setProfile({
              name: data.name || '',
              email: data.email || user.email || '',
              number: data.number || '',
              birthday: data.birthday || '',
              address: data.address || '',
            });
          } else {
            // if no document, fallback to user info
            setProfile({
              name: user.displayName || '',
              email: user.email || '',
              number: '',
              birthday: '',
              address: '',
            });
          }
        } catch (err) {
          console.error('Error fetching admin_user:', err);
          alert('Unable to load profile. Check console for details.');
        }
      } else {
        // no user: clear profile
        setProfile({
          name: '',
          email: '',
          number: '',
          birthday: '',
          address: '',
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Open edit modal and populate editableProfile
  const openEditModal = () => {
    setEditableProfile({
      name: profile.name || '',
      email: profile.email || '',
      number: profile.number || '',
      birthday: profile.birthday || '', // keep ISO format for input[type=date]
      address: profile.address || '',
    });
    setShowEditModal(true);
  };

  // Save profile changes to Firestore (admin_user/{uid})
  const handleProfileSave = async () => {
    const confirmed = window.confirm('Save profile changes?');
    if (!confirmed) return;

    // Basic validation
    if (!editableProfile.name.trim()) {
      alert('Name cannot be empty.');
      return;
    }
    if (!editableProfile.email.trim()) {
      alert('Email cannot be empty.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('No authenticated user.');
      return;
    }

    try {
      const docRef = doc(db, 'admin_users', user.uid);
      // Prepare object — keep fields consistent
      const updateObj = {
        name: editableProfile.name.trim(),
        email: editableProfile.email.trim(),
        number: editableProfile.number.trim(),
        birthday: editableProfile.birthday, // ISO 'YYYY-MM-DD' from date input
        address: editableProfile.address.trim(),
      };
      await updateDoc(docRef, updateObj);

      // Update local profile state
      setProfile(updateObj);
      setShowEditModal(false);
      alert('Profile updated successfully.');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Error saving profile: ' + (err.message || err));
    }
  };

  // Password save (keep original flow but renamed)
  const handlePasswordSave = async () => {
    const confirmed = window.confirm('Are you sure you want to save password changes?');
    if (!confirmed) return;

    const anyPasswordFilled = currentPassword || newPassword || confirmNewPassword;
    const allPasswordFilled = currentPassword && newPassword && confirmNewPassword;

    if (anyPasswordFilled && !allPasswordFilled) {
      alert('Please complete all password fields.');
      return;
    }

    if (allPasswordFilled) {
      if (newPassword.length < 6) {
        alert('New password must be at least 6 characters.');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        alert('New passwords do not match.');
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user || !user.email) {
          alert('No authenticated user.');
          return;
        }
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        alert('Password updated successfully.');

        // Clear fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setShowPasswordModal(false);
      } catch (error) {
        console.error(error);
        alert('Error updating password: ' + (error.message || error));
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerCard}>
        <div className={styles.avatarWrap}>
          {/* Flaticon avatar image (you can replace the src with your preferred Flaticon link) */}
          <img
            src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
            alt="profile avatar"
            className={styles.profileFlaticon}
          />
        </div>
        <div className={styles.headerText}>
          <h1>Account Settings</h1>
          <p className={styles.subText}>Administrator — Manage your profile and security</p>
        </div>
        <div className={styles.headerAction}>
          <button className={styles.editProfileBtn} onClick={openEditModal}>
            <FaEdit /> Edit Profile
          </button>
        </div>
      </div>

      <div className={styles.cardFull}>
        {/* Profile Card */}
        <div className={styles.card}>
          <h2>Profile Information</h2>
          <div className={styles.profileInfo}>
            <div className={styles.profileRow}>
              <FaUserCircle className={styles.fieldIcon} />
              <div>
                <p className={styles.fieldLabel}>Full name</p>
                <p className={styles.fieldValue}>{profile.name || '—'}</p>
              </div>
            </div>

            <div className={styles.profileRow}>
              <FaEnvelope className={styles.fieldIcon} />
              <div>
                <p className={styles.fieldLabel}>Email</p>
                <p className={styles.fieldValue}>{profile.email || '—'}</p>
              </div>
            </div>

            <div className={styles.profileRow}>
              <FaPhoneAlt className={styles.fieldIcon} />
              <div>
                <p className={styles.fieldLabel}>Phone</p>
                <p className={styles.fieldValue}>{profile.number || '—'}</p>
              </div>
            </div>

            <div className={styles.profileRow}>
              <FaBirthdayCake className={styles.fieldIcon} />
              <div>
                <p className={styles.fieldLabel}>Birthday</p>
                <p className={styles.fieldValue}>
                  {profile.birthday ? formatBirthday(profile.birthday) : '—'}
                </p>
              </div>
            </div>

            <div className={styles.profileRow}>
              <FaMapMarkerAlt className={styles.fieldIcon} />
              <div>
                <p className={styles.fieldLabel}>Address</p>
                <p className={styles.fieldValue}>{profile.address || '—'}</p>
              </div>
            </div>
          </div>

            <h2>Account Security</h2>
            <div
              className={styles.securityClickable}
              onClick={() => setShowPasswordModal(true)}
              role="button"
            >
              <div>
                <span><FaLock /> Change Password</span>
                <p className={styles.small}>Update your account password</p>
              </div>
              <FaArrowRight />
            </div>
        </div>     
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Edit Profile</h3>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.inputLabel}>
                <span className={styles.inputLabelTitle}><FaUserCircle /> Name</span>
                <input
                  type="text"
                  value={editableProfile.name}
                  onChange={(e) => setEditableProfile({ ...editableProfile, name: e.target.value })}
                />
              </label>

              <label className={styles.inputLabel}>
                <span className={styles.inputLabelTitle}><FaEnvelope /> Email</span>
                <input
                  type="email"
                  value={editableProfile.email}
                  onChange={(e) => setEditableProfile({ ...editableProfile, email: e.target.value })}
                />
              </label>

              <label className={styles.inputLabel}>
                <span className={styles.inputLabelTitle}><FaPhoneAlt /> Phone</span>
                <input
                  type="text"
                  value={editableProfile.number}
                  onChange={(e) => setEditableProfile({ ...editableProfile, number: e.target.value })}
                />
              </label>

              <label className={styles.inputLabel}>
                <span className={styles.inputLabelTitle}><FaBirthdayCake /> Birthday</span>
                <input
                  type="date"
                  value={editableProfile.birthday || ''}
                  onChange={(e) => setEditableProfile({ ...editableProfile, birthday: e.target.value })}
                />
              </label>

              <label className={styles.inputLabel}>
                <span className={styles.inputLabelTitle}><FaMapMarkerAlt /> Address</span>
                <input
                  type="text"
                  value={editableProfile.address}
                  onChange={(e) => setEditableProfile({ ...editableProfile, address: e.target.value })}
                />
              </label>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.saveButton} onClick={handleProfileSave}>
                <FaSave /> Save Changes
              </button>
              <button className={styles.cancelButton} onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
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
              <button className={styles.saveButton} onClick={handlePasswordSave}>
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
  );
};

export default Settings;
