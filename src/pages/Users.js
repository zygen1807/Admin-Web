import React, { useEffect, useState } from "react";
import styles from "./Users.module.css";
import { FaSearch } from 'react-icons/fa';
import { collection, doc, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

const User = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All Users");
  const [showModal, setShowModal] = useState(false);
  const [userType, setUserType] = useState("Pregnant Women");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");

  const handleOpenModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFullName(user.name || "");
      setContact(user.phone || "");
      setUserType(user.type);
    } else {
      setSelectedUser(null);
      setFullName("");
      setContact("");
      setUserType("Pregnant Women");
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleUserTypeChange = (e) => setUserType(e.target.value);

  const fetchUsers = async () => {
    const pregnantSnap = await getDocs(collection(db, "pregnant_users"));
    const bhwSnap = await getDocs(collection(db, "bhw_users"));
    const rescuerSnap = await getDocs(collection(db, "rescuer_users"));

    const pregnant = pregnantSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      collection: "pregnant_users",
      type: "Pregnant Women",
    }));

    const bhw = bhwSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      collection: "bhw_users",
      type: "BHW",
    }));

    const rescuer = rescuerSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      collection: "rescuer_users",
      type: "Barangay Rescuer",
    }));

    setAllUsers([...pregnant, ...bhw, ...rescuer]);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = allUsers.filter(user => {
    const matchName = user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filter === "All Users" || user.type === filter;
    return matchName && matchType;
  });

  const handleDelete = async (user) => {
    const confirmed = window.confirm(`Are you sure you want to delete ${user.name}?`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, user.collection, user.id));
      fetchUsers();
      alert("User deleted successfully.");
    } catch (error) {
      console.error("Delete Error:", error);
      alert("Failed to delete user.");
    }
  };

  const handleSave = async () => {
    if (!fullName || !contact) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      if (selectedUser) {
        const userRef = doc(db, selectedUser.collection, selectedUser.id);
        await updateDoc(userRef, {
          name: fullName,
          phone: contact,
        });
        alert("User updated.");
      } else {
        alert("Add functionality not implemented in this version.");
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save user.");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>User Management</h1>

      <div className={styles.headerRow}>
        <div className={styles.searchContainer}>
    <input
      className={styles.searchInput}
      type="text"
      placeholder="Search users..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
    <FaSearch className={styles.searchIcon} />
  </div>
        <div className={styles.filterGroup}>
          <select
            className={styles.filterDropdown}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All Users</option>
            <option>Pregnant Women</option>
            <option>BHW</option>
            <option>Barangay Rescuer</option>
          </select>
        </div>

        {/*<button className={styles.addUserButton} onClick={() => handleOpenModal()}>
          + Add User
        </button>*/}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>User Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.name || "N/A"}</td>
                <td>{user.email || "N/A"}</td>
                <td>{user.type}</td>
                <td>
                  <button className={styles.iconButton} onClick={() => handleOpenModal(user)}>✏️</button>
                  <button className={styles.iconButton} onClick={() => handleDelete(user)}>🗑️</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} style={{ textAlign: "center" }}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={styles.pagination}>
        <span>Showing {filteredUsers.length} results</span>
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button className={styles.modalClose} onClick={handleCloseModal}>
              &times;
            </button>
            <div className={styles.modalHeader}>
              {selectedUser ? "Edit User" : "Add New User"}
            </div>
            <div className={styles.modalBody}>
              <label>
                Full Name
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              <label>
                Contact Number
                <input
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </label>
              <label>
                User Type
                <select value={userType} onChange={handleUserTypeChange} disabled={!!selectedUser}>
                  <option value="Pregnant Women">Pregnant Women</option>
                  <option value="BHW">BHW</option>
                  <option value="Barangay Rescuer">Barangay Rescuer</option>
                </select>
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.buttonCancel} onClick={handleCloseModal}>
                Cancel
              </button>
              <button className={styles.buttonAdd} onClick={handleSave}>
                {selectedUser ? "Save Changes" : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default User;
