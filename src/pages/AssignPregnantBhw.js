// src/pages/AssignPregnantBhw.js
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import styles from "./AssignPregnantBhw.module.css";

const AssignPregnantBhw = () => {
  const [bhwList, setBhwList] = useState([]);
  const [pregnantList, setPregnantList] = useState([]);
  const [selectedBhw, setSelectedBhw] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [assignedPregnants, setAssignedPregnants] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCheckupModal, setShowCheckupModal] = useState(false);
  const [selectedPregnant, setSelectedPregnant] = useState(null);
  const [checkupDate, setCheckupDate] = useState("");
  const [checkupTime, setCheckupTime] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch all BHWs and Pregnant Users
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const bhwSnap = await getDocs(collection(db, "bhw_users"));
      const pregSnap = await getDocs(collection(db, "pregnant_users"));

      const bhws = await Promise.all(
        bhwSnap.docs.map(async (docSnap, index) => {
          const bhwId = docSnap.id;
          const patientsRef = collection(db, `bhw_patient_list/${bhwId}/patients`);
          const patientsSnap = await getDocs(patientsRef);
          return {
            id: bhwId,
            no: index + 1,
            name: docSnap.data().name,
            assignedCount: patientsSnap.size,
          };
        })
      );

      setBhwList(bhws);
      setPregnantList(pregSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };

    fetchData();
  }, []);

  // Filter pregnant users who are not yet assigned
  const getUnassignedPregnants = async () => {
    const assignedIds = new Set();
    for (const bhw of bhwList) {
      const snap = await getDocs(collection(db, `bhw_patient_list/${bhw.id}/patients`));
      snap.forEach((d) => assignedIds.add(d.id));
    }
    return pregnantList.filter((p) => !assignedIds.has(p.id));
  };

  // Open Add modal
  const handleOpenAddModal = async (bhw) => {
    setSelectedBhw(bhw);
    const unassigned = await getUnassignedPregnants();
    setPregnantList(unassigned);
    setShowAddModal(true);
  };

  // Open View Assigned modal
  const handleOpenViewModal = async (bhw) => {
    setSelectedBhw(bhw);
    const patientsSnap = await getDocs(
      collection(db, `bhw_patient_list/${bhw.id}/patients`)
    );
    const assigned = [];
    for (const docSnap of patientsSnap.docs) {
      const pregRef = doc(db, "pregnant_users", docSnap.id);
      const pregData = await getDoc(pregRef);
      if (pregData.exists()) assigned.push({ id: pregData.id, ...pregData.data() });
    }
    setAssignedPregnants(assigned);
    setShowViewModal(true);
  };

  // Confirm adding pregnant to bhw
  const handleAddPregnant = (preg) => {
    setSelectedPregnant(preg);
    setShowConfirmModal(true);
  };

  // Save assignment to Firestore
  const confirmAdd = async () => {
    if (!selectedBhw || !selectedPregnant) return;

    // Save to bhw_patient_list
    const patientRef = doc(
      db,
      `bhw_patient_list/${selectedBhw.id}/patients/${selectedPregnant.id}`
    );
    await setDoc(patientRef, { patientId: selectedPregnant.id });

    // Then show checkup modal
    setShowConfirmModal(false);
    setShowCheckupModal(true);
  };

  // Save first checkup info
  const handleSaveCheckup = async () => {
    if (!checkupDate || !checkupTime) {
      alert("Please enter date and time for first check-up");
      return;
    }

    const checkupRef = doc(db, `date_checkup_records/${selectedPregnant.id}`);
    await setDoc(checkupRef, {
      date: checkupDate,
      time: checkupTime,
      bhwId: selectedBhw.id,
      patientId: selectedPregnant.id,
    });

    alert("Pregnant assigned and check-up recorded!");

    // Remove from list immediately
    setPregnantList((prev) =>
      prev.filter((p) => p.id !== selectedPregnant.id)
    );

    setShowCheckupModal(false);
    setSelectedPregnant(null);
    setCheckupDate("");
    setCheckupTime("");
  };

  // Remove assigned pregnant
  const handleRemoveAssigned = async (pregId) => {
    if (!selectedBhw) return;
    await deleteDoc(doc(db, `bhw_patient_list/${selectedBhw.id}/patients/${pregId}`));
    setAssignedPregnants((prev) => prev.filter((p) => p.id !== pregId));
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  const filteredPregnants = pregnantList.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Assign Pregnant to BHW</h1>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>BHW Name</th>
            <th>Assigned Pregnant</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {bhwList.map((bhw) => (
            <tr key={bhw.id}>
              <td>{bhw.no}</td>
              <td>{bhw.name}</td>
              <td>{bhw.assignedCount}</td>
              <td>
                <button
                  className={styles.assignButton}
                  onClick={() => handleOpenAddModal(bhw)}
                >
                  Assign Pregnant
                </button>
                <button
                  className={styles.viewButton}
                  onClick={() => handleOpenViewModal(bhw)}
                >
                  View Assigned
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Pregnant Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>
              Add Pregnant for {selectedBhw.name}
            </h2>

            <input
              type="text"
              className={styles.inputField}
              placeholder="Search pregnant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className={styles.scrollArea}>
              {filteredPregnants.map((preg) => (
                <div key={preg.id} className={styles.assignedRow}>
                  <span>{preg.name}</span>
                  <button
                    className={styles.saveButton}
                    onClick={() => handleAddPregnant(preg)}
                  >
                    Add
                  </button>
                </div>
              ))}
              {filteredPregnants.length === 0 && (
                <p style={{ textAlign: "center", color: "#888" }}>
                  No available pregnant users
                </p>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowAddModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Assigned Modal */}
      {showViewModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>
              Assigned to {selectedBhw.name}
            </h2>
            <div className={styles.scrollArea}>
              {assignedPregnants.map((preg) => (
                <div key={preg.id} className={styles.assignedRow}>
                  <span>{preg.name}</span>
                  <button
                    className={styles.removeButton}
                    onClick={() => handleRemoveAssigned(preg.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {assignedPregnants.length === 0 && (
                <p style={{ textAlign: "center", color: "#888" }}>
                  No assigned pregnant users
                </p>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Add Modal */}
      {showConfirmModal && selectedPregnant && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>
              Confirm Assign
            </h3>
            <p>
              Assign <strong>{selectedPregnant.name}</strong> to{" "}
              <strong>{selectedBhw.name}</strong>?
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={confirmAdd}
              >
                Yes, Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-up Modal */}
      {showCheckupModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>First Check-Up</h3>
            <label className={styles.inputLabel}>Date</label>
            <input
              type="date"
              className={styles.inputField}
              value={checkupDate}
              onChange={(e) => setCheckupDate(e.target.value)}
            />
            <label className={styles.inputLabel}>Time</label>
            <input
              type="time"
              className={styles.inputField}
              value={checkupTime}
              onChange={(e) => setCheckupTime(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowCheckupModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSaveCheckup}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignPregnantBhw;
