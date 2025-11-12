import React, { useEffect, useState } from "react";
import styles from "./Users.module.css";
import { FaSearch } from "react-icons/fa";
import {
  getDocs,
  collection,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

const User = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All Users");
  const [showModal, setShowModal] = useState(false);
  const [userType, setUserType] = useState("Pregnant Women");
  const [allUsers, setAllUsers] = useState([]);

  // at the top with other states
const [showCheckupModal, setShowCheckupModal] = useState(false);
const [checkupDate, setCheckupDate] = useState("");

  // inactive lists
  const [pregnantInactive, setPregnantInactive] = useState([]);
  const [bhwInactive, setBhwInactive] = useState([]);
  const [rescuerInactive, setRescuerInactive] = useState([]);

  // form fields
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [lmp, setLmp] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [errors, setErrors] = useState({});

  // added: when enabling from inactive, open modal to edit and preserve id
  const [isEnabling, setIsEnabling] = useState(false);
  const [addressList] = useState([
    "Centro",
    "San Miguel",
    "Imbrasan",
    "Barumbong",
    "Himamara",
    "Tagumpay",
    "Ilocandia",
    "Cusol Main",
    "Cusol Annex",
    "Ong-Ong",
    "Catmon",
    "Boundary",
  ]); // you can replace with your real barangay list


  const fetchUsers = async () => {
    const pregnantSnap = await getDocs(collection(db, "pregnant_users"));
    const bhwSnap = await getDocs(collection(db, "bhw_users"));
    const rescuerSnap = await getDocs(collection(db, "rescuer_users"));
    const inactivePreg = await getDocs(collection(db, "pregnant_inactive"));
    const inactiveBhw = await getDocs(collection(db, "bhw_inactive"));
    const inactiveRescuer = await getDocs(collection(db, "rescuer_inactive"));

    setAllUsers([
      ...pregnantSnap.docs.map((d) => ({ id: d.id, ...d.data(), type: "Pregnant Women", collection: "pregnant_users" })),
      ...bhwSnap.docs.map((d) => ({ id: d.id, ...d.data(), type: "BHW", collection: "bhw_users" })),
      ...rescuerSnap.docs.map((d) => ({ id: d.id, ...d.data(), type: "Barangay Rescuer", collection: "rescuer_users" })),
    ]);

    setPregnantInactive(inactivePreg.docs.map((d) => ({ id: d.id, ...d.data() })));
    setBhwInactive(inactiveBhw.docs.map((d) => ({ id: d.id, ...d.data() })));
    setRescuerInactive(inactiveRescuer.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = allUsers.filter((user) => {
    const matchName = user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filter === "All Users" || user.type === filter;
    return matchName && matchType;
  });

  // --- Disable handler
  const handleDisable = async (user) => {
    const confirm = window.confirm(`Disable ${user.name}?`);
    if (!confirm) return;

    try {
      // remove from active
      await deleteDoc(doc(db, user.collection, user.id));

      // add to respective inactive
      let inactiveCol = "";
      if (user.type === "Pregnant Women") inactiveCol = "pregnant_inactive";
      if (user.type === "BHW") inactiveCol = "bhw_inactive";
      if (user.type === "Barangay Rescuer") inactiveCol = "rescuer_inactive";

      await setDoc(doc(collection(db, inactiveCol), user.id), user);

      alert(`${user.name} disabled successfully.`);
      fetchUsers();
    } catch (error) {
      console.error("Disable Error:", error);
    }
  };

  // --- Enable handler
  const handleEnable = (user, type) => {
    // open modal pre-filled so admin can adjust fields (including Pregnancy count)
    const nameParts = (user.name || "").split(" ");
    setSelectedUser(user);
    setUserType(user.type || "Pregnant Women");
    setFirstName(nameParts[0] || "");
    setMiddleName(nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "");
    setLastName(nameParts.length > 1 ? nameParts[nameParts.length - 1] : "");
    setContact(user.phone || "");
    setEmail(user.email || "");
    setAddress(user.address || "");
    setAge(user.age || "");
    setLmp(user.lmp || "");
    setBirthDate(user.birthDate || "");

    setIsEnabling(true);
    setShowModal(true);
  };

  // --- Modal handling
  const handleOpenModal = () => setShowModal(true);
  const clearForm = () => {
    setIsEnabling(false);
    setSelectedUser(null);
    setUserType("Pregnant Women");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setContact("");
    setEmail("");
    setAge("");
    setAddress("");
    setLmp("");
    setBirthDate("");
    setErrors({});
  };
  const handleCloseModal = () => {
    clearForm();
    setShowModal(false);
  };

  const handleUserTypeChange = (e) => setUserType(e.target.value);

  // --- Create user (and also handle 'enable' path when editing from inactive)
 const handleSave = async () => {
  const newErrors = {};

  // Trim inputs
  const fn = firstName.trim();
  const mn = middleName.trim();
  const ln = lastName.trim();
  const em = email.trim();
  const ph = contact.trim();
  const bd = birthDate;
  const lmpDate = lmp;
  const addr = address ? `${address}, Mapaya, San Jose, Occidental Mindoro` : "";
  const ag = age;

  // Validate user type
  if (!userType) newErrors.userType = "Please select user type.";

  // Validate name parts individually so each field shows its own error
  if (!fn) newErrors.firstName = "First name is required.";
  if (!mn) newErrors.middleName = "Middle name is required.";
  if (!ln) newErrors.lastName = "Last name is required.";

  // Common validations
  if (!em) newErrors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) newErrors.email = "Email is not valid.";

  if (!ph) newErrors.contact = "Contact number is required.";
  else {
    const contactRegex = /^[0-9]{11}$/;
    if (!contactRegex.test(ph)) newErrors.contact = "Contact number must be exactly 11 digits.";
  }

  if (!bd) newErrors.birthDate = "Birth date is required.";
  if (!addr) newErrors.address = "Address (barangay) is required.";

  // Pregnant-specific validations
  if (userType === "Pregnant Women") {
    if (!ag && ag !== 0) newErrors.age = "Age is required.";
    else if (isNaN(ag) || Number(ag) <= 0) newErrors.age = "Age must be a valid number greater than 0.";

    if (!lmpDate) newErrors.lmp = "LMP date is required.";

  }

  // If any errors exist, set them and stop here (errors are shown under fields)
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  // Clear errors and continue
  setErrors({});

  // If we are enabling an existing inactive user -> move back to active with same doc id
if (isEnabling && selectedUser) {
  try {
    const inactiveCol = "pregnant_inactive";
    const activeCol = "pregnant_users";

    const fullName = `${fn} ${mn} ${ln}`.trim();

    const updatedUser = {
      ...selectedUser,
      id: selectedUser.id,
      name: fullName,
      phone: ph,
      email: em,
      age: ag,
      address: addr,
      birthDate: bd,
      lmp: lmpDate,
      userType,
      updatedAt: new Date(),
    };

    // Move from inactive → active collection
    await deleteDoc(doc(db, inactiveCol, selectedUser.id));
    await setDoc(doc(db, activeCol, selectedUser.id), updatedUser);

    // ✅ Reset old checkup records
    try {
      const checkupRecordsRef = collection(db, "checkup_record", selectedUser.id, "records");
      const oldRecordsSnap = await getDocs(checkupRecordsRef);

      if (!oldRecordsSnap.empty) {
        let archiveName = "archived_records";
        for (let i = 1; i <= 50; i++) {
          const testName = i === 1 ? "archived_records" : `archived_records${i}`;
          const testRef = collection(db, "checkup_record", selectedUser.id, testName);
          const testSnap = await getDocs(testRef);
          if (testSnap.empty) {
            archiveName = testName;
            break;
          }
        }

        const archiveRef = collection(db, "checkup_record", selectedUser.id, archiveName);
        for (const docSnap of oldRecordsSnap.docs) {
          await setDoc(doc(archiveRef, docSnap.id), docSnap.data());
          await deleteDoc(doc(checkupRecordsRef, docSnap.id));
        }
      }

      const newRecordRef = doc(checkupRecordsRef);
      await setDoc(newRecordRef, {});
    } catch (err) {
      console.error("Error resetting checkup records:", err);
    }

    // ✅ Show checkup date modal only for pregnant women
    if (userType === "Pregnant Women") {
      setShowCheckupModal(true);
    }

    setIsEnabling(false);
    setShowModal(false);
    fetchUsers();
  } catch (error) {
    console.error("Enable Error:", error);
    setErrors({ general: error.message });
  }
  return;
}

  // --- Continue creating new user (unchanged logic) ---
  const autoPassword = bd
    ? (() => {
        const [year, month, day] = bd.split("-");
        return `${month}${day}${year}`;
      })()
    : "default123";

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, em, autoPassword);
    const userId = userCredential.user.uid;
    let collectionName = "";

    if (userType === "Pregnant Women") collectionName = "pregnant_users";
    else if (userType === "BHW") collectionName = "bhw_users";
    else if (userType === "Barangay Rescuer") collectionName = "rescuer_users";
    else {
      alert("Invalid user type");
      return;
    }

    const fullName = `${fn} ${mn} ${ln}`.trim();

    await setDoc(doc(db, collectionName, userId), {
      id: userId,
      name: fullName,
      phone: ph,
      email: em,
      age: ag,
      address: addr,
      birthDate: bd,
      lmp: lmpDate,
      userType,
      createdAt: new Date(),
    });

    alert(`${userType} account created!\nDefault password: ${autoPassword}`);
    setShowModal(false);
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmail("");
    setContact("");
    setAddress("");
    setBirthDate("");
    setAge("");
    setLmp("");
    fetchUsers();
  } catch (error) {
    console.error("Error creating user:", error);
    setErrors({ general: error.message });
  }
};
const handleSaveCheckup = async () => {
  if (!checkupDate) {
    alert("Please select a date for the first checkup");
    return;
  }

  try {
    await setDoc(doc(db, "first_checkup_dates", selectedUser.id), {
      date: checkupDate,
      patientId: selectedUser.id,
    });

    alert(`${selectedUser.name} enabled and first checkup date recorded!`);

    // Close modal and reset state
    setShowCheckupModal(false);
    setCheckupDate("");
    setSelectedUser(null);
    setShowModal(false);
    clearForm();
    fetchUsers();
  } catch (err) {
    console.error("Error saving checkup date:", err);
  }
};

  return (
    <div className={styles.container}>
         <div className={styles.cardFull}>
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

        <button className={styles.addUserButton} onClick={handleOpenModal}>
          + Create Account
        </button>
      </div>

      {/* Active Users */}
      <h2>Active Users</h2>
     <table className={styles.table} style={{ border: "1px solid #333" }}>
  <thead style={{ backgroundColor: "#333", color: "#fff" }}>
    <tr>
      <th style={{ border: "1px solid #ccc" }}>Name</th>
      <th style={{ border: "1px solid #ccc" }}>Phone Number</th>
      <th style={{ border: "1px solid #ccc" }}>Email</th>
      <th style={{ border: "1px solid #ccc" }}>Address</th>
      <th style={{ border: "1px solid #ccc" }}>User Type</th>
      <th style={{ border: "1px solid #ccc" }}>Action</th>
    </tr>
  </thead>
  <tbody>
    {filteredUsers.map((user) => (
      <tr key={user.id}>
        <td style={{ border: "1px solid #ccc" }}>{user.name}</td>
        <td style={{ border: "1px solid #ccc" }}>{user.phone}</td>
        <td style={{ border: "1px solid #ccc" }}>{user.email || "—"}</td>
        <td style={{ border: "1px solid #ccc" }}>{user.address || "—"}</td>
        <td style={{ border: "1px solid #ccc" }}>{user.type}</td>
        <td style={{ border: "1px solid #ccc" }}>
          <button
            style={{
              backgroundColor: "red",
              color: "#fff",
              border: "none",
              padding: "5px 10px",
              borderRadius: "5px",
            }}
            onClick={() => handleDisable(user)}
          >
            Disable
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
      {filteredUsers.length > 0 ? (
  <p className={styles.resultsCount}>
    Showing {filteredUsers.length} result{filteredUsers.length !== 1 ? "s" : ""}
  </p>
) : (
  <p className={styles.noResults}>No active users found</p>
)}

      {/* Inactive Pregnant */}
      <h2>Inactive Pregnant Women</h2>
      <table className={styles.table} style={{ border: "1px solid #333" }}>
        <thead style={{ backgroundColor: "#333", color: "#fff" }}>
          <tr>
            <th>Name</th>
            <th>Phone Number</th>
            <th>Email</th>
            <th>Address</th>
            <th>User Type</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {pregnantInactive.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.phone}</td>
              <td>{user.email || "—"}</td>
              <td>{user.address || "—"}</td>
              <td>{user.userType}</td>
              <td>
                <button
                  style={{
                    backgroundColor: "green",
                    color: "#fff",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "5px",
                  }}
                  onClick={() => handleEnable(user, "pregnant")}
                >
                  Enable
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
{pregnantInactive.length > 0 ? (
  <p className={styles.resultsCount}>
    Showing {pregnantInactive.length} result{pregnantInactive.length !== 1 ? "s" : ""}
  </p>
) : (
  <p className={styles.noResults}>No inactive pregnant women found</p>
)}

      {/* Inactive BHW */}
      <h2>Inactive BHW</h2>
      <table className={styles.table} style={{ border: "1px solid #333" }}>
        <thead style={{ backgroundColor: "#333", color: "#fff" }}>
          <tr>
            <th>Name</th>
            <th>Phone Number</th>
            <th>Email</th>
            <th>Address</th>
            <th>User Type</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {bhwInactive.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.phone}</td>
              <td>{user.email || "—"}</td>
              <td>{user.address || "—"}</td>
              <td>{user.userType}</td>
              <td>
                <button
                  style={{
                    backgroundColor: "green",
                    color: "#fff",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "5px",
                  }}
                  onClick={() => handleEnable(user, "bhw")}
                >
                  Enable
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
{bhwInactive.length > 0 ? (
  <p className={styles.resultsCount}>
    Showing {bhwInactive.length} result{bhwInactive.length !== 1 ? "s" : ""}
  </p>
) : (
  <p className={styles.noResults}>No inactive BHW found</p>
)}

      {/* Inactive Rescuer */}
      <h2>Inactive Barangay Rescuer</h2>
      <table className={styles.table} style={{ border: "1px solid #333" }}>
        <thead style={{ backgroundColor: "#333", color: "#fff" }}>
          <tr>
            <th>Name</th>
            <th>Phone Number</th>
            <th>Email</th>
            <th>Address</th>
            <th>User Type</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rescuerInactive.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.phone}</td>
              <td>{user.email || "—"}</td>
              <td>{user.address || "—"}</td>
              <td>{user.userType}</td>
              <td>
                <button
                  style={{
                    backgroundColor: "green",
                    color: "#fff",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "5px",
                  }}
                  onClick={() => handleEnable(user, "rescuer")}
                >
                  Enable
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
{rescuerInactive.length > 0 ? (
  <p className={styles.resultsCount}>
    Showing {rescuerInactive.length} result{rescuerInactive.length !== 1 ? "s" : ""}
  </p>
) : (
  <p className={styles.noResults}>No inactive rescuers found</p>
)}
{showCheckupModal && selectedUser && (
  <div className={styles.modalOverlay}>
    <div className={styles.modal}>
      <button
        className={styles.modalClose}
        onClick={() => setShowCheckupModal(false)}
      >
        &times;
      </button>

      <h3 className={styles.modalTitle}>
        Set First Checkup Date for {selectedUser.name}
      </h3>

      <label>
        Date:
        <input
          type="date"
          value={checkupDate}
          onChange={(e) => setCheckupDate(e.target.value)}
          className={styles.input}
        />
      </label>

      <div className={styles.modalFooter}>
        <button
          className={styles.buttonCancel}
          onClick={() => setShowCheckupModal(false)}
        >
          Cancel
        </button>
        <button
          className={styles.buttonAdd}
          onClick={handleSaveCheckup}
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}

      {/* Create / Edit modal (kept largely the same as original) */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* Close (X) - clears form and closes modal */}
            <button className={styles.modalClose} onClick={handleCloseModal}>
              &times;
            </button>
            
            <div className={styles.modalHeader}>{selectedUser ? "Edit User" : "Create Account User"}</div>

            <div className={styles.modalBody}>
              <label>
                User Type
                <select value={userType} onChange={handleUserTypeChange} disabled={!!selectedUser} className={styles.input}>
                  <option value="Pregnant Women">Pregnant Women</option>
                  <option value="BHW">BHW</option>
                  <option value="Barangay Rescuer">Barangay Rescuer</option>
                </select>
                {errors.userType && <p className={styles.errorText}>{errors.userType}</p>}
              </label>

              {/* Pregnant Women fields */}
{userType === "Pregnant Women" && (
  <>
    <label>
      First Name <span style={{ color: "red" }}>*</span>
      <input
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
      />
      {errors.firstName && <p className={styles.errorText}>{errors.firstName}</p>}
    </label>

    <label>
      Middle Name <span style={{ color: "red" }}>*</span>
      <input
        type="text"
        value={middleName}
        onChange={(e) => setMiddleName(e.target.value)}
        className={`${styles.input} ${errors.middleName ? styles.inputError : ""}`}
      />
      {errors.middleName && <p className={styles.errorText}>{errors.middleName}</p>}
    </label>

    <label>
      Last Name <span style={{ color: "red" }}>*</span>
      <input
        type="text"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
      />
      {errors.lastName && <p className={styles.errorText}>{errors.lastName}</p>}
    </label>

    <label>
      Age <span style={{ color: "red" }}>*</span>
      <input
        type="number"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        className={`${styles.input} ${errors.age ? styles.inputError : ""}`}
      />
      {errors.age && <p className={styles.errorText}>{errors.age}</p>}
    </label>

    <label>
      Address (Barangay) <span style={{ color: "red" }}>*</span>
      <select
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className={`${styles.input} ${errors.address ? styles.inputError : ""}`}
      >
        <option value="">Select Purok in Barangay Mapaya</option>
        {addressList.map((barangay, index) => (
          <option key={index} value={barangay}>
            {barangay}
          </option>
        ))}
      </select>
      {errors.address && <p className={styles.errorText}>{errors.address}</p>}
    </label>

    <label>
      Contact Number <span style={{ color: "red" }}>*</span>
      <input
        type="tel"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        className={`${styles.input} ${errors.contact ? styles.inputError : ""}`}
      />
      {errors.contact && <p className={styles.errorText}>{errors.contact}</p>}
    </label>

    <label>
      Email <span style={{ color: "red" }}>*</span>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
      />
      {errors.email && <p className={styles.errorText}>{errors.email}</p>}
    </label>

    <label>
      LMP Date <span style={{ color: "red" }}>*</span>
      <input
        type="date"
        value={lmp}
        onChange={(e) => setLmp(e.target.value)}
        className={`${styles.input} ${errors.lmp ? styles.inputError : ""}`}
      />
      {errors.lmp && <p className={styles.errorText}>{errors.lmp}</p>}
    </label>

    <label>
      Birth Date <span style={{ color: "red" }}>*</span>
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        className={`${styles.input} ${errors.birthDate ? styles.inputError : ""}`}
      />
      {errors.birthDate && <p className={styles.errorText}>{errors.birthDate}</p>}
    </label>
  </>
)}

{/* BHW fields */}
{userType === "BHW" && (
  <>
    <label>
      First Name <span style={{ color: "red" }}>*</span>
      <input
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
      />
      {errors.firstName && <p className={styles.errorText}>{errors.firstName}</p>}
    </label>

    <label>
      Middle Name <span style={{ color: "red" }}>*</span>
      <input
        type="text"
        value={middleName}
        onChange={(e) => setMiddleName(e.target.value)}
        className={`${styles.input} ${errors.middleName ? styles.inputError : ""}`}
      />
      {errors.middleName && <p className={styles.errorText}>{errors.middleName}</p>}
    </label>

    <label>
      Last Name <span style={{ color: "red" }}>*</span>
      <input
        type="text"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
      />
      {errors.lastName && <p className={styles.errorText}>{errors.lastName}</p>}
    </label>

    <label>
      Contact Number <span style={{ color: "red" }}>*</span>
      <input
        type="tel"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        className={`${styles.input} ${errors.contact ? styles.inputError : ""}`}
      />
      {errors.contact && <p className={styles.errorText}>{errors.contact}</p>}
    </label>

     <label>
      Address (Barangay) <span style={{ color: "red" }}>*</span>
      <select
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className={`${styles.input} ${errors.address ? styles.inputError : ""}`}
      >
        <option value="">Select Purok in Barangay Mapaya</option>
        {addressList.map((barangay, index) => (
          <option key={index} value={barangay}>
            {barangay}
          </option>
        ))}
      </select>
      {errors.address && <p className={styles.errorText}>{errors.address}</p>}
    </label>

    <label>
      Email <span style={{ color: "red" }}>*</span>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
      />
      {errors.email && <p className={styles.errorText}>{errors.email}</p>}
    </label>

    <label>
      Birth Date <span style={{ color: "red" }}>*</span>
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        className={`${styles.input} ${errors.birthDate ? styles.inputError : ""}`}
      />
      {errors.birthDate && <p className={styles.errorText}>{errors.birthDate}</p>}
    </label>
  </>
)}

{/* Barangay Rescuer fields */}
{userType === "Barangay Rescuer" && (
  <>
    <label>
      First Name <span style={{ color: "red" }}>*</span>
      <input
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
      />
      {errors.firstName && <p className={styles.errorText}>{errors.firstName}</p>}
    </label>

    <label>
      Middle Name <span style={{ color: "red" }}>*</span>
      <input
        type="text"
        value={middleName}
        onChange={(e) => setMiddleName(e.target.value)}
        className={`${styles.input} ${errors.middleName ? styles.inputError : ""}`}
      />
      {errors.middleName && <p className={styles.errorText}>{errors.middleName}</p>}
    </label>

    <label>
      Last Name <span style={{ color: "red" }}>*</span>
      <input
        type="text"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
      />
      {errors.lastName && <p className={styles.errorText}>{errors.lastName}</p>}
    </label>

    <label>
      Contact Number <span style={{ color: "red" }}>*</span>
      <input
        type="tel"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        className={`${styles.input} ${errors.contact ? styles.inputError : ""}`}
      />
      {errors.contact && <p className={styles.errorText}>{errors.contact}</p>}
    </label>

    <label>
      Address (Barangay) <span style={{ color: "red" }}>*</span>
      <select
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className={`${styles.input} ${errors.address ? styles.inputError : ""}`}
      >
        <option value="">Select Purok in Barangay Mapaya</option>
        {addressList.map((barangay, index) => (
          <option key={index} value={barangay}>
            {barangay}
          </option>
        ))}
      </select>
      {errors.address && <p className={styles.errorText}>{errors.address}</p>}
    </label>

    <label>
      Email <span style={{ color: "red" }}>*</span>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
      />
      {errors.email && <p className={styles.errorText}>{errors.email}</p>}
    </label>

    <label>
      Birth Date <span style={{ color: "red" }}>*</span>
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        className={`${styles.input} ${errors.birthDate ? styles.inputError : ""}`}
      />
      {errors.birthDate && <p className={styles.errorText}>{errors.birthDate}</p>}
    </label>
  </>
)}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.buttonAdd} onClick={handleSave} style={{ width: "100%" }}>
                {isEnabling ? "Enable" : selectedUser ? "Save Changes" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default User;
