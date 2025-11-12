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

const Reports = () => {
  const [bhwData, setBhwData] = useState([]);
  const [pregnantData, setPregnantData] = useState([]);
  const [filter, setFilter] = useState('This Month');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [checkupRecords, setCheckupRecords] = useState([]);
  const [deliveredUsers, setDeliveredUsers] = useState([]);

  const filterByDateRange = (activities, filter, startDate, endDate) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);

    return activities.filter((item) => {
      if (!item.timestamp) return false;
      const itemDate = new Date(item.timestamp);
      const itemMonth = itemDate.getMonth();
      const itemYear = itemDate.getFullYear();

      if (filter === 'This Month') {
        return itemMonth === currentMonth && itemYear === currentYear;
      } else if (filter === 'Last Month') {
        return (
          itemMonth === lastMonthDate.getMonth() &&
          itemYear === lastMonthDate.getFullYear()
        );
      } else if (filter === 'Custom Range' && startDate && endDate) {
        // normalize times for inclusive comparison
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return itemDate >= start && itemDate <= end;
      }

      return true;
    });
  };

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
        // --- 1️⃣ Active Pregnant Women ---
        const activeSnap = await getDocs(collection(db, 'pregnant_users'));
        const activeList = [];

        for (let docSnap of activeSnap.docs) {
          const user = { id: docSnap.id, ...docSnap.data() };

          // Fetch EDC from pregnant_trimester
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
            // keep formatted fields for display (but keep original data too)
            birthDate: formatDate(user.birthDate),
            lmp: user.lmp ? formatDate(user.lmp) : 'N/A',
            edc: user.edc ? formatDate(user.edc) : 'N/A',
          });
        }

        // --- 4️⃣ Delivered Pregnant Women ---
        const deliveredSnap = await getDocs(collection(db, 'done_pregnants'));
        const deliveredList = [];

        for (let docSnap of deliveredSnap.docs) {
          const user = { id: docSnap.id, ...docSnap.data() };

          // Fetch patient details from pregnant_users
          const userDoc = await getDoc(doc(db, 'pregnant_users', user.id));
          const userData = userDoc.exists() ? userDoc.data() : {};

          // Fetch EDC from pregnant_trimester
          const trimesterSnap = await getDocs(
            query(
              collection(db, 'pregnant_trimester'),
              where('patientId', '==', user.id)
            )
          );
          const trimesterData = trimesterSnap.docs[0]?.data();

          // Combine all info
          deliveredList.push({
            id: user.id,
            name: userData.name || '—',
            address: userData.address || '—',
            birthDate: formatDate(userData.birthDate),
            age: userData.age || '—',
            phone: userData.phone || '—',
            lmp: userData.lmp ? formatDate(userData.lmp) : 'N/A',
            edc: trimesterData?.edc ? formatDate(trimesterData.edc) : 'N/A',
            deliveredAt: user.deliveredAt ? formatDate(user.deliveredAt) : 'N/A', // Date Delivered
            timestamp: user.timestamp || user.deliveredAt || null, // for filtering
          });
        }

        const filteredDelivered = filterByDateRange(
          deliveredList,
          filter,
          customStartDate,
          customEndDate
        );
        setDeliveredUsers(filteredDelivered);
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

        const combinedData = trimesterSnap.docs.map((docItem) => {
          const trimesterData = docItem.data();
          const userInfo = usersMap[trimesterData.patientId] || {};

          return {
            id: docItem.id,
            patientId: trimesterData.patientId,
            patientName: userInfo.name || '',
            lmp: trimesterData.lmp ? formatDate(trimesterData.lmp) : 'N/A',
            edc: trimesterData.edc ? formatDate(trimesterData.edc) : 'N/A',
            bmi: trimesterData.bmi || '',
            address: userInfo.address || '',
            birthdate: userInfo.birthDate ? formatDate(userInfo.birthDate) : 'N/A',
            age: userInfo.age || '',
            phoneNumber: userInfo.phone || '',
          };
        });

        setPregnantData(combinedData);
      } catch (err) {
        console.error('Error fetching pregnant data:', err);
      }
    };

    // Call both fetchers in parallel
    fetchSummaryData();
    fetchPregnantData();
  }, [filter, customStartDate, customEndDate]);

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

  const generateSummaryPdf = (data, filename, tableTitle = 'Pregnant Women Report') => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(14);

    // Header format like BHW report
    doc.text('Province of Occidental Mindoro', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.text('Municipality of San Jose', doc.internal.pageSize.getWidth() / 2, 23, { align: 'center' });
    doc.text(tableTitle, doc.internal.pageSize.getWidth() / 2, 31, { align: 'center' });

    const tableData = data.map((u, i) => [
      i + 1,
      u.patientName || u.name || 'N/A',
      u.address || 'N/A',
      u.birthDate || 'N/A',
      u.age || 'N/A',
      u.phone || 'N/A',
      u.lmp || 'N/A',
      u.edc || 'N/A',
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['No.', 'Patient Name', 'Address', 'Birthdate', 'Age', 'Phone Number', 'LMP Date', 'EDC']],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      bodyStyles: { halign: 'center' },
      theme: 'grid',
    });

    doc.save(`${filename}.pdf`);
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
            GP: data.examination || '—',
            TEMPERATURE: data.temperature || '—',
            FH: data.fh || '—',
            PRESENTATION: data.presentation || '—',
            FHT: data.fht || '—',
            'TT GIVEN': data.ttGiven || '—',
            EOG: data.eog || '—',
            FESO4FA: data.feso4fa || '—',
            'CALCIUM CARB': data.calciumCarb || '—',
            'RISK FACTOR': data.riskAssessment || '—',
            LABORATORIES: data.laboratories || '—',
            DONE: data.done || '—',
            RPR: data.rpr || '—',
            HBSAG: data.hbsag || '—',
            CBC: data.cbc || '—',
            'BLOOD SUGAR': data.bloodSugar || '—',
            'HIV SCREENING': data.hivScreening || '—',
            URINALYSIS: data.urinalysis || '—',
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

  // ✅ Generate Checkup Record PDF (landscape like image)
  const handleGeneratePatientPdf = () => {
    if (!selectedPatient || checkupRecords.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Prenatal Checkup Record', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    let y = 25;
    const info = [
      ['NAME:', selectedPatient.patientName || ''],
      ['ADDRESS:', selectedPatient.address || ''],
      ['BIRTHDAY:', selectedPatient.birthdate || ''],
      ['AGE:', selectedPatient.age || ''],
      ['CP NO:', selectedPatient.phoneNumber || ''],
      ['LMP:', selectedPatient.lmp || ''],
      ['EDC:', selectedPatient.edc || ''],
      ['BMI:', selectedPatient.bmi || ''],
    ];
    info.forEach(([label, value]) => {
      doc.text(`${label}`, 14, y);
      doc.text(`${value}`, 45, y);
      y += 6;
    });

    const headers = ['Date', ...checkupRecords.map((r) => r.date)];
    const fields = Object.keys(checkupRecords[0] || {}).filter((f) => f !== 'date');
    const body = fields.map((f) => [f, ...checkupRecords.map((r) => r[f] || '—')]);

    autoTable(doc, {
      startY: y + 4,
      head: [headers],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      bodyStyles: { halign: 'center' },
      theme: 'grid',
    });

    doc.save(`${(selectedPatient.patientName || 'patient').replace(/\s+/g, '_')}_checkup_record.pdf`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
        <div className={styles.header}>
          <h1>Generate Reports</h1>
          <div className={styles.controlsWrapper}>
            <div className={styles.controls}>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option>This Month</option>
                <option>Last Month</option>
                <option>Custom Range</option>
              </select>
            </div>

            {filter === 'Custom Range' && (
              <div className={styles.dateRange}>
                <DatePicker
                  selected={customStartDate}
                  onChange={setCustomStartDate}
                  placeholderText="Start Date"
                />
                <DatePicker
                  selected={customEndDate}
                  onChange={setCustomEndDate}
                  placeholderText="End Date"
                />
              </div>
            )}
          </div>
        </div>

        {/* --- 4️⃣ Delivered Pregnant Women --- */}
        <h3>
          Delivered Pregnant Women ({deliveredUsers.length})
          <button
            onClick={() => generateSummaryPdf(deliveredUsers, 'delivered_pregnant', 'Delivered Pregnant Women Report')}
            style={{
              backgroundColor: '#27ae60',
              color: '#fff',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '5px',
              marginLeft: '12px',
            }}
          >
            🡇 Generate Report
          </button>
        </h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Patient Name</th>
              <th>Address</th>
              <th>Birthdate</th>
              <th>Age</th>
              <th>Phone Number</th>
              <th>LMP Date</th>
              <th>EDC</th>
            </tr>
          </thead>
          <tbody>
            {deliveredUsers.map((u, i) => (
              <tr key={u.id}>
                <td>{i + 1}</td>
                <td>{u.name}</td>
                <td>{u.address}</td>
                <td>{u.birthDate}</td>
                <td>{u.age}</td>
                <td>{u.phone}</td>
                <td>{u.lmp}</td>
                <td>{u.edc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ marginTop: '50px' }}>Pregnant Checkup Records</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Patient Name</th>
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

              {/* ✅ Generate PDF button */}
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
