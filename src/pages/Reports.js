import React, { useEffect, useState } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './Reports.module.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

const Reports = () => {
  const [bhwData, setBhwData] = useState([]);
  const [filter, setFilter] = useState('This Month');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);

  // NEW: filtered pregnant data for charts
  const [filteredPregnantData, setFilteredPregnantData] = useState([]);
  const [filteredTrimesterData, setFilteredTrimesterData] = useState({ first: 0, second: 0, third: 0 });

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

    fetchBhwActivity();
  }, [filter, customStartDate, customEndDate]);

  // Update filtered pregnant data whenever filter changes
  useEffect(() => {
    const fetchPregnantData = async () => {
      try {
        const userSnap = await getDocs(collection(db, 'pregnant_users'));
        const trimesterSnap = await getDocs(collection(db, 'pregnant_trimester'));

        const filteredUsers = userSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.() }))
          .filter(user => {
            if (!user.createdAt) return false;
            const date = user.createdAt;
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);

            if (filter === 'This Month') return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            if (filter === 'Last Month') return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
            if (filter === 'Custom Range' && customStartDate && customEndDate) return date >= customStartDate && date <= customEndDate;
            return true;
          });

        setFilteredPregnantData(filteredUsers);

        // Compute trimester distribution for filtered users
        let trimesterCounts = { first: 0, second: 0, third: 0 };
        trimesterSnap.forEach(doc => {
          const t = doc.data().trimester;
          if (t === '1st Trimester') trimesterCounts.first++;
          else if (t === '2nd Trimester') trimesterCounts.second++;
          else if (t === '3rd Trimester') trimesterCounts.third++;
        });

        setFilteredTrimesterData(trimesterCounts);

      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

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

  // Dynamic line and pie chart data
  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Pregnant Users',
        data: filteredPregnantData.reduce((acc, user) => {
          const month = user.createdAt?.getMonth() ?? 0;
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, new Array(12).fill(0)),
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.3,
        fill: false,
      },
    ],
  };

  const pieData = {
    labels: ['1st Trimester', '2nd Trimester', '3rd Trimester'],
    datasets: [
      {
        data: [
          filteredTrimesterData.first,
          filteredTrimesterData.second,
          filteredTrimesterData.third,
        ],
        backgroundColor: ['#93c5fd', '#bbf7d0', '#fca5a5'],
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'No. of Pregnant Users' },
      },
      x: {
        title: { display: true, text: 'Month' },
      },
    },
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
      datalabels: {
        anchor: 'end',
        align: 'top',
        color: '#111827',
        font: { weight: 'bold' },
        formatter: (value) => value,
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        color: '#000',
        font: { weight: 'bold' },
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%';
        },
      },
    },
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
        <div className={styles.header}>
          <h1>Reports and Analytics</h1>
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
      </div>

      <div className={styles.card}>
        <h2>Pregnant Users by Month</h2>
        <div style={{ height: '300px' }}>
          <Line data={lineData} options={lineOptions} />
        </div>
        <p className={styles.footer}>Monthly Breakdown of Registered Pregnant Users</p>
      </div>

      <div className={styles.card}>
        <h2>Trimester Distribution</h2>
        <div style={{ width: '300px', height: '300px', margin: '0 auto' }}>
          <Pie data={pieData} options={pieOptions} />
        </div>

        <div style={{ marginTop: '12px' }}>
          {[
            { label: '1st Trimester', count: filteredTrimesterData.first, color: '#93c5fd' },
            { label: '2nd Trimester', count: filteredTrimesterData.second, color: '#bbf7d0' },
            { label: '3rd Trimester', count: filteredTrimesterData.third, color: '#fca5a5' },
          ].map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ width: 12, height: 12, backgroundColor: item.color, marginRight: 6 }} />
              <span style={{ fontSize: 13 }}>{item.label} — {item.count} Pregnant Women</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;
