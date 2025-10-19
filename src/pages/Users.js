import React, { useEffect, useState } from "react";
import styles from "./Users.module.css";
import { FaSearch } from "react-icons/fa";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const User = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All Users");
  const [showModal, setShowModal] = useState(false);
  const [userType, setUserType] = useState("Pregnant Women");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Disabled users list (pulled from Firestore field `disabled` if present)
  const [disabledUsers, setDisabledUsers] = useState([]);

  // Checkup modal
  const [showCheckupModal, setShowCheckupModal] = useState(false);
  const [checkupRecords, setCheckupRecords] = useState([]);
  const [checkupLoading, setCheckupLoading] = useState(false);
  const [selectedCheckupUser, setSelectedCheckupUser] = useState(null);

  // Updated name fields
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  // Other fields
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [lmp, setLmp] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const handleOpenModal = (user = null) => {
    if (user) {
      const nameParts = (user.name || "").split(" ");
      setFirstName(nameParts[0] || "");
      setMiddleName(nameParts[1] || "");
      setLastName(nameParts.slice(2).join(" ") || "");

      setSelectedUser(user);
      setContact(user.phone || "");
      setEmail(user.email || "");
      setAge(user.age || "");
      setAddress(user.address || "");
      setLmp(user.lmp || "");
      setBirthDate(user.birthDate || "");
      setUserType(user.type);
    } else {
      setSelectedUser(null);
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setContact("");
      setEmail("");
      setAge("");
      setAddress("");
      setLmp("");
      setBirthDate("");
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

    const pregnant = pregnantSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      collection: "pregnant_users",
      type: "Pregnant Women",
    }));

    const bhw = bhwSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      collection: "bhw_users",
      type: "BHW",
    }));

    const rescuer = rescuerSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      collection: "rescuer_users",
      type: "Barangay Rescuer",
    }));

    const combined = [...pregnant, ...bhw, ...rescuer];

    // split disabled users (if the document has a `disabled: true` field)
    setDisabledUsers(combined.filter((u) => u.disabled));
    setAllUsers(combined.filter((u) => !u.disabled));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = allUsers.filter((user) => {
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
  if (!firstName || !lastName || !contact) {
    alert("Please fill in all required fields.");
    return;
  }

  const fullName = `${firstName} ${middleName} ${lastName}`.trim();
  const autoPassword = birthDate
    ? (() => {
        const [year, month, day] = birthDate.split("-"); // "YYYY", "MM", "DD"
        return `${month}${day}${year}`; // MMDDYYYY
      })()
    : "default123";

  try {
    if (selectedUser) {
      // Update existing user
      const userRef = doc(db, selectedUser.collection, selectedUser.id);
      await updateDoc(userRef, {
        name: fullName,
        phone: contact,
        email,
        age,
        address,
        lmp,
        birthDate,
      });
      alert("User updated.");
    } else {
      const confirmCreate = window.confirm(
        `Are you sure you want to create an account for ${fullName}?`
      );
      if (!confirmCreate) return;

      if (userType === "Pregnant Women") {
        if (!email) {
          alert("Please enter an Email address.");
          return;
        }

        // 🔹 Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          autoPassword
        );

        const patientId = userCredential.user.uid;

        // 🔹 Create document with same ID as patientId
        const pregnantRef = doc(db, "pregnant_users", patientId);
        await setDoc(pregnantRef, {
          patientId: patientId,
          name: fullName,
          phone: contact,
          email,
          age,
          address,
          lmp,
          birthDate,
          userType: "Pregnant",
          createdAt: new Date(),
          approved: true,
        });

        alert(`Pregnant user account created!\nDefault Password: ${autoPassword}`);
      }

      // ✅ NEW: Create BHW
      else if (userType === "BHW") {
        if (!email) {
          alert("Please enter an Email address.");
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          autoPassword
        );

        const bhwId = userCredential.user.uid;

        // 🔹 Create document with same ID as bhwId
        const bhwRef = doc(db, "bhw_users", bhwId);
        await setDoc(bhwRef, {
          bhwId,
          name: fullName,
          phone: contact,
          email,
          address,
          birthDate,
          userType: "BHW",
          createdAt: new Date(),
        });

        alert(`BHW account created!\nDefault Password: ${autoPassword}`);
      }

      // ✅ NEW: Create Barangay Rescuer
      else if (userType === "Barangay Rescuer") {
        if (!email) {
          alert("Please enter an Email address.");
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          autoPassword
        );

        const rescuerId = userCredential.user.uid;

        // 🔹 Create document with same ID as rescuerId
        const rescuerRef = doc(db, "rescuer_users", rescuerId);
        await setDoc(rescuerRef, {
          rescuerId,
          name: fullName,
          phone: contact,
          email,
          address,
          birthDate,
          userType: "Barangay Rescuer",
          createdAt: new Date(),
        });

        alert(`Barangay Rescuer account created!\nDefault Password: ${autoPassword}`);
      }
    }

    setShowModal(false);
    fetchUsers();
  } catch (error) {
    console.error("Save Error:", error);
    alert("Failed to save user: " + error.message);
  }
};

  // Open checkup records modal for a user
 const handleOpenCheckup = async (user) => {
  try {
    setSelectedCheckupUser(user);
    setCheckupLoading(true);

    // ✅ Path: checkup_record/{userId}/records
    const recordsRef = collection(db, "checkup_record", user.id, "records");

    // Fetch newest to oldest by date (if `createdAt` exists)
    const q = query(recordsRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    const recs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    setCheckupRecords(recs);
    setShowCheckupModal(true);
  } catch (err) {
    console.error("Error fetching checkup records:", err);
    alert("Failed to load checkup records.");
  } finally {
    setCheckupLoading(false);
  }
};

  const handleCloseCheckup = () => {
    setShowCheckupModal(false);
    setCheckupRecords([]);
    setSelectedCheckupUser(null);
  };

  // Disable user (moves to disabled table and marks doc.disabled = true)
  const handleDisable = async (user) => {
    const confirm = window.confirm(`Disable ${user.name}?`);
    if (!confirm) return;

    try {
      const userRef = doc(db, user.collection, user.id);
      await updateDoc(userRef, { disabled: true });
      fetchUsers();
    } catch (err) {
      console.error("Disable error:", err);
      alert("Failed to disable user.");
    }
  };

  const handleEnable = async (user) => {
    const confirm = window.confirm(`Enable ${user.name}?`);
    if (!confirm) return;

    try {
      const userRef = doc(db, user.collection, user.id);
      await updateDoc(userRef, { disabled: false });
      fetchUsers();
    } catch (err) {
      console.error("Enable error:", err);
      alert("Failed to enable user.");
    }
  };
const toggleDropdown = (e) => {
  const dropdown = e.currentTarget.nextSibling;
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
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

        <button className={styles.addUserButton} onClick={() => handleOpenModal()}>
          + Create Account
        </button>
      </div>

      {/* Main table (active users) */}
      <table className={styles.table} style={{ color: "#333" }}>
        <thead style={{ backgroundColor: "#333", color: "#fff" }}>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>User Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name || "N/A"}</td>
                <td>{user.email || "N/A"}</td>
                <td>{user.type}</td>
                <td>
                  {/* Removed Edit and Delete icons. Replaced with Checkup Info icon and Disable button */}

       


                  <button
  className={`${styles.actionButton} ${user.disabled ? styles.disabled : styles.enabled}`}
  onClick={() => handleDisable(user)}
>
  Disable
</button>

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

      <div style={{ marginTop: 20 }}>
        <h2>Disabled Users</h2>
        <table className={styles.table} style={{ color: "#333" }}>
          <thead style={{ backgroundColor: "#333", color: "#fff" }}>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>User Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {disabledUsers.length > 0 ? (
              disabledUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.name || "N/A"}</td>
                  <td>{user.email || "N/A"}</td>
                  <td>{user.type}</td>
                  <td>
                    <button
                      className={styles.iconButton}
                      title="View Checkup Records"
                      onClick={() => handleOpenCheckup(user)}
                    >
                      🩺
                    </button>

                    <button
  className={`${styles.actionButton} ${user.disabled ? styles.disabled : styles.enabled}`}
  onClick={() => handleEnable(user)}
>
  Enable
</button>

                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  No disabled users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
  <span>Showing {disabledUsers.length} results</span>
</div>

      {/* Create / Edit modal (kept largely the same as original) */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button className={styles.modalClose} onClick={handleCloseModal}>
              &times;
            </button>
            <div className={styles.modalHeader}>
              {selectedUser ? "Edit User" : "Create Account User"}
            </div>

            <div className={styles.modalBody}>
              <label>
                User Type
                <select
                  value={userType}
                  onChange={handleUserTypeChange}
                  disabled={!!selectedUser}
                >
                  <option value="Pregnant Women">Pregnant Women</option>
                  <option value="BHW">BHW</option>
                  <option value="Barangay Rescuer">Barangay Rescuer</option>
                </select>
              </label>

              {/* Pregnant Women fields */}
              {userType === "Pregnant Women" && (
                <>
                  <label>
                    First Name
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </label>
                  <label>
                    Middle Name
                    <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                  </label>
                  <label>
                    Last Name
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </label>
                  <label>
                    Age
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                  </label>
                  <label>
                    Address
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </label>
                  <label>
                    Contact Number
                    <input type="tel" value={contact} onChange={(e) => setContact(e.target.value)} />
                  </label>
                  <label>
                    Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                  <label>
                    LMP Date
                    <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} />
                  </label>
                  <label>
                    Birth Date
                    <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  </label>
                </>
              )}

              {/* BHW fields */}
              {userType === "BHW" && (
                <>
                  <label>
                    First Name
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </label>
                  <label>
                    Middle Name
                    <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                  </label>
                  <label>
                    Last Name
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </label>
                  <label>
                    Contact Number
                    <input type="tel" value={contact} onChange={(e) => setContact(e.target.value)} />
                  </label>
                  <label>
                    Address
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </label>
                  <label>
                    Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                  <label>
                    Birth Date
                    <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  </label>
                </>
              )}

              {/* Barangay Rescuer fields */}
              {userType === "Barangay Rescuer" && (
                <>
                  <label>
                    First Name
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </label>
                  <label>
                    Middle Name
                    <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                  </label>
                  <label>
                    Last Name
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </label>
                  <label>
                    Contact Number
                    <input type="tel" value={contact} onChange={(e) => setContact(e.target.value)} />
                  </label>
                  <label>
                    Address
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </label>
                  <label>
                    Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                  <label>
                    Birth Date
                    <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  </label>
                </>
              )}
            </div>

           <div className={styles.modalFooter}>
            <button
            className={styles.buttonAdd}
            onClick={handleSave}
            style={{ width: "100%" }} // expand to full width
                >
    {selectedUser ? "Save Changes" : "Create Account"}
  </button>
</div>

          </div>
        </div>
          )}

      {/* Checkup Records Modal (landscape-like display) */}
     {showCheckupModal && (
  <div className={styles.modalOverlay}>
    <div className={styles.modal} style={{ width: "500px", maxHeight: "80vh", overflowY: "auto" }}>
      <button className={styles.modalClose} onClick={handleCloseCheckup}>
        &times;
      </button>

      <div className={styles.modalHeader}>
        Checkup Records for {selectedCheckupUser?.name || "User"}
      </div>

      <div className={styles.modalBody}>
        {checkupLoading ? (
          <p>Loading...</p>
        ) : checkupRecords.length === 0 ? (
          <p>No checkup records found.</p>
        ) : (
          checkupRecords.map((rec) => {
            const created = rec.createdAt && rec.createdAt.toDate
              ? rec.createdAt.toDate()
              : rec.createdAt
              ? new Date(rec.createdAt)
              : null;

            const title = created ? created.toLocaleString() : rec.id;

            // Toggle dropdown
            const toggleDropdown = (e) => {
              const dropdown = e.currentTarget.nextSibling;
              dropdown.style.display =
                dropdown.style.display === "block" ? "none" : "block";
            };

            return (
              <div key={rec.id} className={styles.checkupCard}>
                <button className={styles.recordButton} onClick={toggleDropdown}>
                  {title} ⬇
                </button>

                <div className={styles.recordDropdown}>
                  {Object.entries(rec).map(([k, v]) => {
                    if (k === "id") return null;
                    const display =
                      v && typeof v === "object" ? JSON.stringify(v) : String(v);
                    return (
                      <div key={k} className={styles.recordField}>
                        <strong>{k}:</strong> {display}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.modalFooter}>
        
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default User;
