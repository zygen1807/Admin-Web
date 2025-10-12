import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
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
  const [showPregnantRecords, setShowPregnantRecords] = useState({});

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

        const filtered = filterByDateRange(allActivities, filter, customStartDate, customEndDate);
        setBhwData(filtered);
      } catch (error) {
        console.error('Error fetching BHW activity:', error);
      }
    };

    const fetchPregnantData = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'checkup_record'));
    const data = await Promise.all(
      snapshot.docs.map(async (docItem) => {
        const recsSnap = await getDocs(collection(db, 'checkup_record', docItem.id, 'records'));
        const records = recsSnap.docs.map((r) => ({ id: r.id, ...r.data() }));
        const docData = docItem.data();
        return {
          id: docItem.id,
          name: docData.patientName || 'N/A', // ✅ use patientName
          address: docData.address || 'N/A',
          riskAssessment: docData.riskAssessment || 'N/A',
          records,
        };
      })
    );
    setPregnantData(data);
  } catch (err) {
    console.error('Error fetching pregnant checkup records:', err);
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
      head: [['No.', 'Name', 'Address', 'Duties', 'Task', 'Pregnancy\nTracking', 'Total', 'Remarks']],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      bodyStyles: { halign: 'center' },
      theme: 'grid',
    });

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.text('CHERRY ANN M. BALMES, RM', 20, finalY);
    doc.text('JENLYN F. LOMOCSO, MD', 90, finalY);
    doc.text('EMELYN M. GABAO', 160, finalY);
    doc.text('Rural Health Midwife', 20, finalY + 5);
    doc.text('Municipal Health Officer', 90, finalY + 5);
    doc.text('BHW Coordinator', 160, finalY + 5);

    doc.save(`bhw_activity_report_${filter.replace(" ", "_").toLowerCase()}_2025.pdf`);
    await incrementReportCount();
  };

  const togglePregnantDropdown = (id) => {
    setShowPregnantRecords((prev) => ({ ...prev, [id]: !prev[id] }));
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
                <DatePicker selected={customStartDate} onChange={setCustomStartDate} placeholderText="Start Date" />
                <DatePicker selected={customEndDate} onChange={setCustomEndDate} placeholderText="End Date" />
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
              <th>Risk Assessment</th>
              <th>Other Records</th>
            </tr>
          </thead>
          <tbody>
            {pregnantData.map((preg, index) => (
              <React.Fragment key={preg.id}>
                <tr>
                  <td>{index + 1}</td>
                  <td>{preg.name}</td>
                  <td>{preg.riskAssessment}</td>
                  <td>
                    <button
                      style={{ backgroundColor: 'green', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer' }}
                      onClick={() => togglePregnantDropdown(preg.id)}
                    >
                      {showPregnantRecords[preg.id] ? 'Hide Records ⬆' : 'Show Records ⬇'}
                    </button>
                  </td>
                </tr>
                {showPregnantRecords[preg.id] &&
                  preg.records.map((r) => (
                    <tr key={r.id} style={{ backgroundColor: '#f5f5f5' }}>
                      <td colSpan={5}>
                        {Object.entries(r).map(([k, v]) =>
                          k === 'id' ? null : (
                            <div key={k}>
                              <strong>{k}:</strong> {v?.toString() || 'N/A'}
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
