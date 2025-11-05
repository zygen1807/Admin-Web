import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
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
        return itemDate >= startDate && itemDate <= endDate;
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
    const fetchBhwActivity = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'bhw_activity'));
        const allActivities = snapshot.docs.map((doc) => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate?.();
          const duties = data.duties || 0;
          const task = data.task || 0;
          const tracking = data.tracking || 0;
          const total = duties + task + tracking;

          let remarks = 'Incomplete';
          if (total >= 30) remarks = 'Completed';
          else if (total >= 20) remarks = 'Ongoing Monitoring';

          return {
            id: doc.id,
            name: data.name || 'N/A',
            address: data.address || 'N/A',
            duties,
            task,
            tracking,
            total,
            remarks,
            timestamp,
          };
        });

        const filtered = filterByDateRange(
          allActivities,
          filter,
          customStartDate,
          customEndDate
        );
        setBhwData(filtered);
      } catch (error) {
        console.error('Error fetching BHW activity:', error);
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

        const combinedData = trimesterSnap.docs.map((doc) => {
          const trimesterData = doc.data();
          const userInfo = usersMap[trimesterData.patientId] || {};

          return {
            id: doc.id,
            patientId: trimesterData.patientId,
            patientName: userInfo.name || '',
            lmp: formatDate(trimesterData.lmp),
            edc: formatDate(trimesterData.edc),
            bmi: trimesterData.bmi || '',
            address: userInfo.address || '',
            birthdate: formatDate(userInfo.birthDate),
            age: userInfo.age || '',
            phoneNumber: userInfo.phone || '',
          };
        });

        setPregnantData(combinedData);
      } catch (err) {
        console.error('Error fetching pregnant data:', err);
      }
    };

    fetchBhwActivity();
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

  const handleGeneratePdf = async () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Province of Occidental Mindoro', 105, 15, { align: 'center' });
    doc.text('Municipality of San Jose', 105, 23, { align: 'center' });
    doc.text(`${filter.toUpperCase()} 2025`, 105, 31, { align: 'center' });

    const tableData = bhwData.map((item, index) => [
      index + 1,
      item.name,
      item.address,
      item.duties,
      item.task,
      item.tracking,
      item.total,
      item.remarks,
    ]);

    autoTable(doc, {
      startY: 40,
      head: [
        [
          'No.',
          'Name',
          'Address',
          'Duties',
          'Task',
          'Pregnancy\nTracking',
          'Total',
          'Remarks',
        ],
      ],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      bodyStyles: { halign: 'center' },
      theme: 'grid',
    });

    doc.save(`bhw_activity_report_${filter.replace(' ', '_').toLowerCase()}_2025.pdf`);
    await incrementReportCount();
  };

  const openCheckupModal = async (preg) => {
    setSelectedPatient(preg);
    setShowModal(true);

    try {
      const recSnap = await getDocs(
        collection(db, 'checkup_record', preg.patientId, 'records')
      );
      const recData = recSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            date: formatDate(data.date),
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
        .sort((a, b) => new Date(a.date) - new Date(b.date));

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
    doc.setFontSize(12);
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
      ['BMI:', selectedPatient.bmi || '']
    ];
    info.forEach(([label, value]) => {
      doc.text(`${label}`, 14, y);
      doc.text(`${value}`, 45, y);
      y += 6;
    });

    const headers = ['Date', ...checkupRecords.map(r => r.date)];
    const fields = Object.keys(checkupRecords[0] || {}).filter(f => f !== 'date');
    const body = fields.map(f => [f, ...checkupRecords.map(r => r[f] || '—')]);

    autoTable(doc, {
      startY: y + 4,
      head: [headers],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      bodyStyles: { halign: 'center' },
      theme: 'grid',
    });

    doc.save(`${selectedPatient.patientName.replace(/\s+/g, '_')}_checkup_record.pdf`);
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
              <button onClick={handleGeneratePdf} className={styles.generateBtn}>
                🡇 Generate Report
              </button>
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

        <h2>BHW Activity Summary</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No.</th>
              <th>BHW Name</th>
              <th>Address</th>
              <th>Duties</th>
              <th>Task</th>
              <th>Pregnancy Tracking</th>
              <th>Total</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {bhwData.map((bhw, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{bhw.name}</td>
                <td>{bhw.address}</td>
                <td>{bhw.duties}</td>
                <td>{bhw.task}</td>
                <td>{bhw.tracking}</td>
                <td>{bhw.total}</td>
                <td>
                  <span
                    className={`${styles.remark} ${
                      bhw.remarks === 'Completed'
                        ? styles.green
                        : bhw.remarks === 'Ongoing Monitoring'
                        ? styles.orange
                        : styles.red
                    }`}
                  >
                    {bhw.remarks}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Pregnant Checkup Records</h2>
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

              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
                Checkup Records
              </h3>

              <div style={{ marginBottom: '20px', lineHeight: '1.8' }}>
                <div><strong>NAME:</strong> <span style={{ textDecoration: 'underline' }}>{selectedPatient.patientName || ' '}</span></div>
                <div><strong>ADDRESS:</strong> <span style={{ textDecoration: 'underline' }}>{selectedPatient.address || ' '}</span></div>
                <div><strong>BIRTHDAY:</strong> <span style={{ textDecoration: 'underline' }}>{selectedPatient.birthdate || ' '}</span></div>
                <div><strong>AGE:</strong> <span style={{ textDecoration: 'underline' }}>{selectedPatient.age || ' '}</span></div>
                <div><strong>CP:</strong> <span style={{ textDecoration: 'underline' }}>{selectedPatient.phoneNumber || ' '}</span></div>
                <div><strong>LMP:</strong> <span style={{ textDecoration: 'underline' }}>{selectedPatient.lmp || ' '}</span></div>
                <div><strong>EDC:</strong> <span style={{ textDecoration: 'underline' }}>{selectedPatient.edc || ' '}</span></div>
               
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
                  marginBottom: '10px'
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
