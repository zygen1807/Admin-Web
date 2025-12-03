import React, { useEffect, useState } from "react";
import "./SuperAdminPage.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

import { FiCopy, FiRefreshCw, FiTrash } from "react-icons/fi";

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const [generatedKey, setGeneratedKey] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);

  // NEW STATES FOR MODALS
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMustSaveKey, setShowMustSaveKey] = useState(false);
  const [centerMessage, setCenterMessage] = useState("");
  const [showCenterMessage, setShowCenterMessage] = useState(false);

  // Fetch admin_users from Firestore
  const fetchAdminUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "admin_users"));
    const users = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setAdminUsers(users);
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  // Delete user in table
  const deleteUser = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      await deleteDoc(doc(db, "admin_users", id));
      fetchAdminUsers();
    }
  };

  // Generate long token-like key
  const generateKey = () => {
    const length = 48;
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedKey(token);
  };

  // Save key in Firestore
  const saveKey = async () => {
    if (!generatedKey) return;

    const expireTime = new Date();
    expireTime.setHours(expireTime.getHours() + 1);

    try {
      await addDoc(collection(db, "admin_access_key"), {
        key: generatedKey,
        createdAt: serverTimestamp(),
        expiresAt: expireTime,
      });

      // Show centered message
      setCenterMessage("Key saved successfully! Expires in 1 hour.");
      setShowCenterMessage(true);

      setGeneratedKey("");
    } catch (err) {
      console.error(err);
      setCenterMessage("Failed to save key.");
      setShowCenterMessage(true);
    }
  };

  // Handle logout
  const handleLogoutClick = () => {
    // If generatedKey is NOT saved → block logout
    if (generatedKey.trim() !== "") {
      setShowMustSaveKey(true);
      return;
    }

    // Otherwise show confirmation modal
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="super-admin-page-container">
      {/* Top Nav */}
      <div className="super-admin-topnav">
        <h2>Super Admin Dashboard</h2>

        <div
          className="profile-container"
          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            className="profile-icon"
            alt="profile"
          />

          {showProfileDropdown && (
            <div className="profile-dropdown">
              <button onClick={handleLogoutClick}>Logout</button>
            </div>
          )}
        </div>
      </div>

      {/* TABLE OF USERS */}
      <div className="table-container">
        <h2 className="table-title">Registered Administrators</h2>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone Number</th>
              <th>Birthday</th>
              <th>Address</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {adminUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  No registered admins found.
                </td>
              </tr>
            ) : (
              adminUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || "—"}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.number || "—"}</td>
                  <td>{u.birthday || "—"}</td>
                  <td>{u.address || "—"}</td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => deleteUser(u.id)}
                    >
                      <FiTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* KEY GENERATOR */}
      <div className="key-generator-container">
        <h1>Admin Access Key Generator</h1>
        <p className="subtitle">
          Generate a one-time Admin access key. After generating, copy and
          securely share the key with the intended Administrator or Midwife.
        </p>

        <div className="key-box">
          <label>Your Generated Key</label>

          <div className="key-input-wrapper">
            <input
              type="text"
              readOnly
              value={generatedKey}
              placeholder="Click </> to generate a key..."
            />

            <button className="icon-btn" onClick={generateKey}>
              <FiRefreshCw />
            </button>

            <button
              className="icon-btn"
              onClick={() => {
                if (!generatedKey) return;

                navigator.clipboard.writeText(generatedKey);
                setCenterMessage("Copied to clipboard!");
                setShowCenterMessage(true);
              }}
            >
              <FiCopy />
            </button>
          </div>

          <button
            className="save-btn"
            disabled={!generatedKey}
            onClick={saveKey}
          >
            Save Access Key
          </button>
        </div>
      </div>

      {/* LOGOUT CONFIRM MODAL */}
      {showLogoutConfirm && (
        <div className="center-modal-overlay">
          <div className="center-modal">
            <h3>Are you sure you want to logout?</h3>

            <div className="modal-btn-row">
              <button className="yes-btn" onClick={confirmLogout}>
                Yes, Logout
              </button>
              <button
                className="no-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MUST SAVE KEY MODAL */}
      {showMustSaveKey && (
        <div className="center-modal-overlay">
          <div className="center-modal">
            <h3>You need to save the Admin Access Key before logging out.</h3>
            <button
              className="ok-btn"
              onClick={() => setShowMustSaveKey(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* CENTER MESSAGE MODAL */}
      {showCenterMessage && (
        <div className="center-modal-overlay">
          <div className="center-modal">
            <h3>{centerMessage}</h3>
            <button
              className="ok-btn"
              onClick={() => setShowCenterMessage(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
