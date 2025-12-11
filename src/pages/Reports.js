import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import styles from './Reports.module.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaSearch } from "react-icons/fa";

const monthOrder = ["01","02","03","04","05","06","07","08","09","10","11","12"];

const monthNames = {
  "01": "January",
  "02": "February",
  "03": "March",
  "04": "April",
  "05": "May",
  "06": "June",
  "07": "July",
  "08": "August",
  "09": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

const Reports = () => {
  const [bhwData, setBhwData] = useState([]);
  const [pregnantData, setPregnantData] = useState([]);
  const [filter, setFilter] = useState('This Month');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [checkupRecords, setCheckupRecords] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedRecords, setEditedRecords] = useState([]); // for edit modal
  const [saving, setSaving] = useState(false);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    let d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Helper to format date to YYYY-MM-DD for <input type="date" />
  const toISODateString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        const activeSnap = await getDocs(collection(db, 'pregnant_users'));
        const activeList = [];

        for (let docSnap of activeSnap.docs) {
          const user = { id: docSnap.id, ...docSnap.data() };

          const trimesterSnap = await getDocs(
            query(
              collection(db, 'pregnant_trimester'),
              where('patientId', '==', user.id)
            )
          );
          const trimesterData = trimesterSnap.docs[0]?.data();
          user.edc = trimesterData?.edc || '—';
          user.lmp = trimesterData?.lmp || user.lmp || null;
          user.birthDate = user.birthDate || user.birthdate || null;
          user.timestamp = user.timestamp || trimesterData?.timestamp || null;

          activeList.push({
            ...user,
            birthDate: formatDate(user.birthDate),
            lmp: user.lmp ? formatDate(user.lmp) : 'N/A',
            edc: user.edc ? formatDate(user.edc) : 'N/A',
          });
        }

        setBhwData(activeList);
      } catch (err) {
        console.error('Error fetching summary data:', err);
      }
    };

    const fetchPregnantData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'pregnant_users'));
        const trimesterSnap = await getDocs(collection(db, 'pregnant_trimester'));

        const usersMap = {};
        usersSnap.forEach((u) => {
          usersMap[u.id] = { id: u.id, ...u.data() };
        });

        let combinedData = trimesterSnap.docs.map((docItem) => {
          const trimesterData = docItem.data();
          const userInfo = usersMap[trimesterData.patientId] || {};

          const edcFormatted = trimesterData.edc ? formatDate(trimesterData.edc) : 'N/A';
          const lmpFormatted = trimesterData.lmp ? formatDate(trimesterData.lmp) : 'N/A';
          const birthdateFormatted = userInfo.birthDate ? formatDate(userInfo.birthDate) : 'N/A';

          // filter by selectedMonth if provided (match by EDC month)
          if (selectedMonth) {
            const edcDate = trimesterData.edc?.toDate ? trimesterData.edc.toDate() : (trimesterData.edc ? new Date(trimesterData.edc) : null);
            const month = edcDate ? String(edcDate.getMonth() + 1).padStart(2, '0') : null;
            if (month !== selectedMonth) return null;
          }

          return {
            id: docItem.id,
            patientId: trimesterData.patientId,
            patientName: userInfo.name || '',
            lmp: lmpFormatted,
            edc: edcFormatted,
            bmi: trimesterData.bmi || '',
            address: userInfo.address || '',
            birthdate: birthdateFormatted,
            age: userInfo.age || '',
            phoneNumber: userInfo.phone || '',
          };
        });

        combinedData = combinedData.filter((u) => u !== null);
        setPregnantData(combinedData);
      } catch (err) {
        console.error('Error fetching pregnant data:', err);
      }
    };

    fetchSummaryData();
    fetchPregnantData();
  }, [filter, customStartDate, customEndDate, selectedMonth]);

  const incrementReportCount = async () => {
    const countDocRef = doc(db, 'report_stats', 'generated');
    try {
      // proper way is updateDoc with increment, but preserve your prior behavior (merge)
      await setDoc(countDocRef, { count: increment(1) }, { merge: true });
    } catch (err) {
      try {
        const docSnap = await getDoc(countDocRef);
        if (docSnap.exists()) {
          await updateDoc(countDocRef, { count: docSnap.data().count + 1 });
        } else {
          await setDoc(countDocRef, { count: 1 });
        }
      } catch (e) {
        console.error('Error incrementing report count:', e);
      }
    }
  };

  const openCheckupModal = async (preg) => {
    setSelectedPatient(preg);
    setShowModal(true);

    try {
      const recSnap = await getDocs(collection(db, 'checkup_record', preg.patientId, 'records'));
      const recData = recSnap.docs
        .map((d) => {
          const data = d.data();
          // get proper Date object
          let dt = null;
          if (data.date) {
            if (data.date.toDate) dt = data.date.toDate();
            else dt = new Date(data.date);
          }
          const monthNum = dt ? String(dt.getMonth() + 1).padStart(2, '0') : null; // "01", ..., "12"

          // Convert Firestore Timestamp to human and keep ISO for sorting & editing
          return {
            id: d.id, // include doc id
            date: data.date ? formatDate(data.date) : 'N/A',
            dateISO: dt ? toISODateString(dt) : '',
            month: monthNum,
            // copy other fields (keep original keys)
            bloodPressure: data.bloodPressure || '—',
            height: data.height || '—',
            weight: data.weight || '—',
            muac: data.muac || '—',
            Gp: data.Gp || '—',
            temperature: data.temperature || '—',
            fh: data.fh || '—',
            presentation: data.presentation || '—',
            fht: data.fht || '—',
            ttGiven: data.ttGiven || '—',
            aog: data.aog || '—',
            feso4fa: data.feso4fa || '—',
            calciumCarb: data.calciumCarb || '—',
            riskAssessment: data.riskAssessment || '—',
            riskFactor: data.riskFactor || '—',
            // store original raw data too if needed
            __raw: data,
          };
        })
        .sort((a, b) => {
          const da = a.dateISO ? new Date(a.dateISO) : new Date(a.date);
          const dbb = b.dateISO ? new Date(b.dateISO) : new Date(b.date);
          return da - dbb;
        });

      setCheckupRecords(recData);
    } catch (err) {
      console.error('Error fetching checkup records:', err);
      setCheckupRecords([]);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPatient(null);
    setCheckupRecords([]);
  };

  // Open the Edit modal (editable table). It reads current checkupRecords into editable copy.
  const openEditModal = async (preg) => {
    // If modal for same patient is already loaded in checkupRecords, just use them.
    // Otherwise, fetch similarly to openCheckupModal
    await openCheckupModal(preg); // this will set checkupRecords and showModal; we'll hide that modal if open
    // ensure main modal not shown
    setShowModal(false);

    // create editable copy
    const editable = (checkupRecords.length ? checkupRecords : []).map((r) => {
      // copy every key except internal ones
      const copy = { ...r };
      // keep dateISO if exists
      return { ...copy };
    });

    // If checkupRecords not yet set (because openCheckupModal is async), wait a tick and then set
    if (!editable.length) {
      // try fetching directly here
      try {
        const recSnap = await getDocs(collection(db, 'checkup_record', preg.patientId, 'records'));
        const recData = recSnap.docs.map((d) => {
          const data = d.data();
          let dt = null;
          if (data.date) {
            if (data.date.toDate) dt = data.date.toDate();
            else dt = new Date(data.date);
          }
          const monthNum = dt ? String(dt.getMonth() + 1).padStart(2, '0') : null;
          return {
            id: d.id,
            date: data.date ? formatDate(data.date) : 'N/A',
            dateISO: dt ? toISODateString(dt) : '',
            month: monthNum,
            bloodPressure: data.bloodPressure || '',
            height: data.height || '',
            weight: data.weight || '',
            muac: data.muac || '',
            Gp: data.Gp || '',
            temperature: data.temperature || '',
            fh: data.fh || '',
            presentation: data.presentation || '',
            fht: data.fht || '',
            ttGiven: data.ttGiven || '',
            aog: data.aog || '',
            feso4fa: data.feso4fa || '',
            calciumCarb: data.calciumCarb || '',
            riskAssessment: data.riskAssessment || '',
            riskFactor: data.riskFactor || '',
            __raw: data,
          };
        });

        setEditedRecords(recData);
      } catch (err) {
        console.error('Error fetching records for edit modal:', err);
        setEditedRecords([]);
      }
    } else {
      setEditedRecords(editable);
    }

    setSelectedPatient(preg);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditedRecords([]);
    setSelectedPatient(null);
  };

  // Handle change in an editable cell
  const handleEditedChange = (recordId, field, value) => {
    setEditedRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, [field]: value } : r))
    );
  };

  // Save edited records back to Firestore
  const saveEditedRecords = async () => {
    if (!selectedPatient) return;
    setSaving(true);

    try {
      // iterate through editedRecords and update each document
      for (const rec of editedRecords) {
        const recRef = doc(db, 'checkup_record', selectedPatient.patientId, 'records', rec.id);

        // Build an update payload: convert dateISO back to Timestamp if present
        const payload = { ...rec }; // copy
        // Remove helper keys not stored in Firestore
        delete payload.id;
        delete payload.date; // human readable
        delete payload.dateISO;
        delete payload.month;
        delete payload.__raw;

        // If user edited date (record had dateISO), convert to Timestamp
        if (rec.dateISO) {
          // try to create Date from ISO
          const d = new Date(rec.dateISO);
          if (!isNaN(d.getTime())) {
            payload.date = Timestamp.fromDate(d);
          }
        }

        // Firestore update: updateDoc will set only fields provided
        try {
          await updateDoc(recRef, payload);
        } catch (err) {
          // If updateDoc fails because doc doesn't exist, create it
          await setDoc(recRef, payload, { merge: true });
        }
      }

      // Re-fetch the checkup records to reflect saved changes in UI
      const recSnap = await getDocs(collection(db, 'checkup_record', selectedPatient.patientId, 'records'));
      const recData = recSnap.docs
        .map((d) => {
          const data = d.data();
          let dt = null;
          if (data.date) {
            if (data.date.toDate) dt = data.date.toDate();
            else dt = new Date(data.date);
          }
          const monthNum = dt ? String(dt.getMonth() + 1).padStart(2, '0') : null;
          return {
            id: d.id,
            date: data.date ? formatDate(data.date) : 'N/A',
            dateISO: dt ? toISODateString(dt) : '',
            month: monthNum,
            bloodPressure: data.bloodPressure || '—',
            height: data.height || '—',
            weight: data.weight || '—',
            muac: data.muac || '—',
            Gp: data.Gp || '—',
            temperature: data.temperature || '—',
            fh: data.fh || '—',
            presentation: data.presentation || '—',
            fht: data.fht || '—',
            ttGiven: data.ttGiven || '—',
            aog: data.aog || '—',
            feso4fa: data.feso4fa || '—',
            calciumCarb: data.calciumCarb || '—',
            riskAssessment: data.riskAssessment || '—',
            riskFactor: data.riskFactor || '—',
            __raw: data,
          };
        })
        .sort((a, b) => {
          const da = a.dateISO ? new Date(a.dateISO) : new Date(a.date);
          const dbb = b.dateISO ? new Date(b.dateISO) : new Date(b.date);
          return da - dbb;
        });

      setCheckupRecords(recData);
      setEditedRecords([]);
      setShowEditModal(false);
      setSaving(false);
    } catch (err) {
      console.error('Error saving edited records:', err);
      setSaving(false);
      // keep modal open so user can retry
    }
  };

  const handleGeneratePatientPdf = () => {
    if (!selectedPatient || checkupRecords.length === 0) return;

    const doc = new jsPDF("landscape", "mm", "a4");
    const pageWidth = doc.internal.pageSize.width;

    // Header text
    doc.setFont("Times", "Normal");
    doc.setFontSize(12);
    doc.text("Province of Occidental Mindoro", pageWidth / 2, 12, { align: "center" });
    doc.text("Municipality of San Jose", pageWidth / 2, 18, { align: "center" });
    doc.text("PRENATAL CHECKUP RECORD", pageWidth / 2, 24, { align: "center" });

    let y = 32;

    // Patient info
    doc.setFontSize(10);
    const info = [
      ['NAME:', selectedPatient.patientName || ''],
      ['ADDRESS:', selectedPatient.address || ''],
      ['BIRTHDAY:', selectedPatient.birthdate || ''],
      ['AGE:', selectedPatient.age || ''],
      ['CP NO:', selectedPatient.phoneNumber || ''],
      ['LMP:', selectedPatient.lmp || ''],
      ['EDC:', selectedPatient.edc || ''],
    ];

    info.forEach(([label, value]) => {
      doc.text(label, 14, y);
      doc.text(value, 50, y);
      y += 6;
    });

    // Table data
    const headers = ['Date', ...checkupRecords.map((r) => r.date)];
    const fields = Object.keys(checkupRecords[0] || {}).filter((f) => f !== 'date' && f !== 'id' && f !== 'dateISO' && f !== 'month' && f !== '__raw');
    const body = fields.map((f) => [f, ...checkupRecords.map((r) => r[f] || '—')]);

    autoTable(doc, {
      startY: y + 4,
      head: [headers],
      body,
      theme: "grid",
      styles: { fontSize: 9, halign: "left", cellPadding: 2 },
      headStyles: { fillColor: false, textColor: 0 },
    });

    const finalY = doc.lastAutoTable.finalY + 18;

    // Footer signatures
    const signatures = [
      { name: "CHERRY ANN B. BALMES, RM", title: "Rural Health Midwife", x: 20, width: 70 },
      { name: "JENILYN F. LOMOCSO, MD", title: "Municipal Health Officer", x: 110, width: 80 },
      { name: "EMELYN M. GABAO", title: "BHW Coordinator", x: 205, width: 80 },
    ];

    signatures.forEach((sig) => {
      doc.setFont("Times", "Bold");
      doc.text(sig.name, sig.x + sig.width / 2 - doc.getTextWidth(sig.name) / 2, finalY);
      doc.line(sig.x, finalY + 2, sig.x + sig.width, finalY + 2);
      doc.setFont("Times", "Normal");
      doc.text(sig.title, sig.x + sig.width / 2 - doc.getTextWidth(sig.title) / 2, finalY + 7);
    });

    doc.save(`${(selectedPatient.patientName || 'patient').replace(/\s+/g, '_')}_checkup_record.pdf`);
  };

  // filtered view by search input and month select
  const displayedPregnantData = pregnantData.filter((p) => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return true;
    return (
      (p.patientName || "").toLowerCase().includes(q) ||
      (p.address || "").toLowerCase().includes(q) ||
      (p.phoneNumber || "").toLowerCase().includes(q)
    );
  });

  // Filtered checkup columns by selectedMonth (if provided)
  const filteredCheckupRecords = selectedMonth
    ? checkupRecords.filter((rec) => rec.month === selectedMonth)
    : checkupRecords;

  // For edit modal we want columns ordered by date (editedRecords)
  const editColumns = editedRecords.length ? editedRecords : [];

  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
        <h1>Pregnant Checkup Records</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          {/* Search Box - moved left */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search pregnant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "8px 32px 8px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  width: 260,
                }}
              />
              <FaSearch style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            </div>

          </div>

          <label htmlFor="monthSelect">Select Month:</label>
          <select
            id="monthSelect"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">All</option>
            {monthOrder.map((m) => (
              <option key={m} value={m}>
                {monthNames[m]}
              </option>
            ))}
          </select>

        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Pregnant Name</th>
              <th>Address</th>
              <th>Birthdate</th>
              <th>Age</th>
              <th>Phone Number</th>
              <th>LMP Date</th>
              <th>EDC</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayedPregnantData.map((preg, index) => (
              <tr key={preg.id}>
                <td>{index + 1}</td>
                <td>{preg.patientName}</td>
                <td>{preg.address}</td>
                <td>{preg.birthdate}</td>
                <td>{preg.age}</td>
                <td>{preg.phoneNumber}</td>
                <td>{preg.lmp}</td>
                <td>{preg.edc}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={{
                      backgroundColor: '#3498db',
                      color: '#fff',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    onClick={() => openCheckupModal(preg)}
                  >
                    View Checkup Records
                  </button>

                 <button
                style={{
                background: "none",
                  border: "none",
                  cursor: "pointer",
                     padding: 0
                }}
                   onClick={() => openEditModal(preg)}
            >
                <img
                src="https://cdn-icons-png.flaticon.com/512/4476/4476194.png"
              alt="edit"
                style={{ width: 30, height: 30 }}
                   />
                </button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showModal && selectedPatient && (
          <div className={styles.modalOverlay}>
            <div className={styles.landscapeModal}>
              <button
                onClick={closeModal}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: '#e74c3c',
                }}
              >
                ✕
              </button>

              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Checkup Records</h3>

              <div style={{ marginBottom: '20px', lineHeight: '1.8' }}>
                <div>
                  <strong>NAME:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.patientName || ' '}</span>
                </div>
                <div>
                  <strong>ADDRESS:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.address || ' '}</span>
                </div>
                <div>
                  <strong>BIRTHDAY:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.birthdate || ' '}</span>
                </div>
                <div>
                  <strong>AGE:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.age || ' '}</span>
                </div>
                <div>
                  <strong>CP:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.phoneNumber || ' '}</span>
                </div>
                <div>
                  <strong>LMP:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.lmp || ' '}</span>
                </div>
                <div>
                  <strong>EDC:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.edc || ' '}</span>
                </div>
              </div>

              <button
                onClick={handleGeneratePatientPdf}
                style={{
                  backgroundColor: '#27ae60',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '10px',
                }}
              >
                🡇 Generate PDF (Checkup Record)
              </button>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      {filteredCheckupRecords.map((rec, idx) => (
                        <th key={idx}>{rec.date}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(checkupRecords[0] || {})
                      .filter((k) => k !== 'date' && k !== 'id' && k !== 'dateISO' && k !== 'month' && k !== '__raw')
                      .map((field) => (
                        <tr key={field}>
                          <td>{field}</td>
                          {filteredCheckupRecords.map((rec, idx) => (
                            <td key={idx}>{rec[field]}</td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {showEditModal && selectedPatient && (
          <div className={styles.modalOverlay}>
            <div className={styles.landscapeModal} style={{ minWidth: '90vw' }}>
              <button
                onClick={closeEditModal}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: '#e74c3c',
                }}
              >
                ✕
              </button>

              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Edit Checkup Records</h3>

              <div style={{ marginBottom: '20px', lineHeight: '1.8' }}>
                <div>
                  <strong>NAME:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.patientName || ' '}</span>
                </div>
                <div>
                  <strong>ADDRESS:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.address || ' '}</span>
                </div>
                <div>
                  <strong>BIRTHDAY:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.birthdate || ' '}</span>
                </div>
                <div>
                  <strong>AGE:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.age || ' '}</span>
                </div>
                <div>
                  <strong>CP:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.phoneNumber || ' '}</span>
                </div>
                 <div>
                  <strong>LMP:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.lmp || ' '}</span>
                </div>
                <div>
                  <strong>EDC:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{selectedPatient.edc || ' '}</span>
                </div>
              </div>

              <div className={styles.tableWrapper} style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      {editColumns.map((col) => (
                        <th key={col.id}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div>{col.date ? col.date : 'N/A'}</div>
                           
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // gather all possible fields across records (exclude helper keys)
                      const allKeys = new Set();
                      editColumns.forEach((c) => {
                        Object.keys(c).forEach((k) => {
                          if (!['id', 'date', 'dateISO', 'month', '__raw'].includes(k)) {
                            allKeys.add(k);
                          }
                        });
                      });
                      const keys = Array.from(allKeys);
                      return keys.map((field) => (
                        <tr key={field}>
                          <td style={{ fontWeight: '600' }}>{field}</td>
                          {editColumns.map((col) => (
                            <td key={col.id + '_' + field}>
                              <input
                                type="text"
                                value={col[field] === undefined || col[field] === null ? '' : col[field]}
                                onChange={(e) => handleEditedChange(col.id, field, e.target.value)}
                                style={{ width: '140px' }}
                              />
                            </td>
                          ))}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  onClick={saveEditedRecords}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#9ae6b4' : '#2ecc71',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Reports;
