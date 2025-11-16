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
} from 'firebase/firestore';
import { db } from '../firebase';
import styles from './Reports.module.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
  const [selectedMonth, setSelectedMonth] = useState(""); // ✅ added state
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [checkupRecords, setCheckupRecords] = useState([]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
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

          // ✅ filter by selectedMonth
          if (selectedMonth) {
            const edcDate = trimesterData.edc?.toDate ? trimesterData.edc.toDate() : new Date(trimesterData.edc);
            const month = String(edcDate.getMonth() + 1).padStart(2, '0');
            if (month !== selectedMonth) return null; // skip this user if not in selected month
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

        // remove nulls from filtering
        combinedData = combinedData.filter((u) => u !== null);
        setPregnantData(combinedData);
      } catch (err) {
        console.error('Error fetching pregnant data:', err);
      }
    };

    fetchSummaryData();
    fetchPregnantData();
  }, [filter, customStartDate, customEndDate, selectedMonth]); // ✅ added selectedMonth

  const incrementReportCount = async () => {
    const countDocRef = doc(db, 'report_stats', 'generated');
    try {
      await setDoc(countDocRef, { count: increment(1) }, { merge: true });
    } catch (err) {
      const docSnap = await getDoc(countDocRef);
      if (docSnap.exists()) {
        await updateDoc(countDocRef, { count: docSnap.data().count + 1 });
      } else {
        await setDoc(countDocRef, { count: 1 });
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
          return {
            date: data.date ? formatDate(data.date) : 'N/A',
            BP: data.bloodPressure || '—',
            HT: data.height || '—',
            WT: data.weight || '—',
            MUAC: data.muac || '—',
            GP: data.Gp || '—',
            TEMPERATURE: data.temperature || '—',
            FH: data.fh || '—',
            PRESENTATION: data.presentation || '—',
            FHT: data.fht || '—',
            'TT GIVEN': data.ttGiven || '—',
            AOG: data.aog || '—',
            FESO4FA: data.feso4fa || '—',
            'CALCIUM CARB': data.calciumCarb || '—',
            'HEALTH STATUS': data.riskAssessment || '—',
            'RISK FACTOR': data.riskFactor || '—',
          };
        })
        .sort((a, b) => {
          const da = new Date(a.date);
          const dbb = new Date(b.date);
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
  const fields = Object.keys(checkupRecords[0] || {}).filter((f) => f !== 'date');
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

  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
        <h1>Pregnant Checkup Records</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
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
            {pregnantData.map((preg, index) => (
              <tr key={preg.id}>
                <td>{index + 1}</td>
                <td>{preg.patientName}</td>
                <td>{preg.address}</td>
                <td>{preg.birthdate}</td>
                <td>{preg.age}</td>
                <td>{preg.phoneNumber}</td>
                <td>{preg.lmp}</td>
                <td>{preg.edc}</td>
                <td>
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
                      {checkupRecords.map((rec, idx) => (
                        <th key={idx}>{rec.date}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(checkupRecords[0] || {})
                      .filter((k) => k !== 'date')
                      .map((field) => (
                        <tr key={field}>
                          <td>{field}</td>
                          {checkupRecords.map((rec, idx) => (
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
      </div>
    </div>
  );
};

export default Reports;
