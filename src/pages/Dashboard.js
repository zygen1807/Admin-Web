import React, { useEffect, useState } from 'react';
import { FaUser, FaMapMarkerAlt, FaFileAlt, FaBell } from 'react-icons/fa';
import styles from './Dashboard.module.css';
import { getDocs, collection, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

import { Bar, Doughnut } from 'react-chartjs-2';
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
  BarElement,
} from 'chart.js';

ChartJS.register(
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

const Dashboard = () => {
  const [pregnantUsersCount, setPregnantUsersCount] = useState(0);
  const [locationTrackedCount, setLocationTrackedCount] = useState(0);
  const [trimesterCount, setTrimesterCount] = useState(0);
  const [reportsGenerated, setReportsGenerated] = useState(0);

  const [allPregnantUsers, setAllPregnantUsers] = useState([]);
  const [filteredTrimesterData, setFilteredTrimesterData] = useState({ first: 0, second: 0, third: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Pregnant Users Count
        const usersSnap = await getDocs(collection(db, 'pregnant_users'));
        setPregnantUsersCount(usersSnap.size);

        // Location Tracked Count
        const locSnap = await getDocs(collection(db, 'pregnant_locations'));
        setLocationTrackedCount(locSnap.size);

        // 3rd Trimester Count
        const trimesterQuery = query(
          collection(db, 'pregnant_trimester'),
          where('trimester', '==', '3rd Trimester')
        );
        const trimesterSnap = await getDocs(trimesterQuery);
        setTrimesterCount(trimesterSnap.size);

        // Reports Generated Count
        const countDocRef = doc(db, 'report_stats', 'generated');
        const docSnap = await getDoc(countDocRef);
        setReportsGenerated(docSnap.exists() ? docSnap.data().count || 0 : 0);

        // Pregnant Users for Charts
        const allUsers = usersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.(),
        })).filter(user => !!user.createdAt);
        setAllPregnantUsers(allUsers);

        // Trimester Distribution
        const trimesterSnapAll = await getDocs(collection(db, 'pregnant_trimester'));
        let trimesterCounts = { first: 0, second: 0, third: 0 };
        trimesterSnapAll.forEach(doc => {
          const t = doc.data().trimester;
          if (t === '1st Trimester') trimesterCounts.first++;
          else if (t === '2nd Trimester') trimesterCounts.second++;
          else if (t === '3rd Trimester') trimesterCounts.third++;
        });
        setFilteredTrimesterData(trimesterCounts);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };

    fetchStats();
  }, []);

  const stats = [
    { label: 'Total Pregnant Women', value: pregnantUsersCount, icon: <FaUser />, changeType: 'positive' },
    { label: 'Total Active Location-Tracked Pregnant Women', value: locationTrackedCount, icon: <FaMapMarkerAlt />, changeType: 'positive' },
    { label: 'Reports Generated', value: reportsGenerated, icon: <FaFileAlt />, changeType: 'positive' },
    { label: 'Pregnant Women in 3rd Trimester', value: trimesterCount, icon: <FaBell />, changeType: 'negative' },
  ];

  // Charts Data
  const barData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Pregnant Users',
        data: allPregnantUsers.reduce((acc, user) => {
          const month = user.createdAt?.getMonth() ?? 0;
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, new Array(12).fill(0)),
        backgroundColor: 'rgba(16,185,129,0.7)',
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 32,
      },
    ],
  };

  const doughnutData = {
    labels: ['1st Trimester', '2nd Trimester', '3rd Trimester'],
    datasets: [
      {
        data: [
          filteredTrimesterData.first,
          filteredTrimesterData.second,
          filteredTrimesterData.third,
        ],
        backgroundColor: [
          'rgba(59,130,246,0.8)',
          'rgba(34,197,94,0.8)',
          'rgba(239,68,68,0.8)',
        ],
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 8,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
      datalabels: {
        anchor: 'end',
        align: 'top',
        color: '#111827',
        font: { weight: 'bold' },
      },
    },
    scales: {
      x: { title: { display: true, text: 'Month' }, grid: { display: false } },
     y: {
  beginAtZero: true,
  min: 0,
  max: 50, // ✅ Force Y-axis to go up to 50
  title: { display: true, text: 'No. of Pregnant Users' },
  grid: { color: '#f3f4f6' },
  ticks: {
    stepSize: 5, // ✅ control increments (5, 10, 15, …)
  },
},

    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold', size: 16 },
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%';
        },
      },
    },
  };

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Dashboard</h1>

      {/* Stats Cards */}
      <div className={styles.cards}>
        {stats.map((item, index) => (
          <div key={index} className={styles.card}>
            <div className={styles.cardHeader}>
              <p>{item.label}</p>
              <span>{item.icon}</span>
            </div>
            <h2 className={styles.cardValue}>{item.value}</h2>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <h1 className={styles.title}>Analytics</h1>
      <div className={styles.chartsSection}>

        {/* Single container for Doughnut chart + trimester counts */}
        <div className={styles.chartCard}>
          <h2>Pregnant Trimester Distribution</h2>
          <div>
            
            {/* Doughnut Chart */}
            <div style={{ height: '300px' }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>

            {/* Trimester counts */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#3B82F6' }}>
                  {filteredTrimesterData.first} users
                </span>
                <p style={{ margin: 0 }}>1st Trimester</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#22C55E' }}>
                  {filteredTrimesterData.second} users
                </span>
                <p style={{ margin: 0 }}>2nd Trimester</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#EF4444' }}>
                  {filteredTrimesterData.third} users
                </span>
                <p style={{ margin: 0 }}>3rd Trimester</p>
              </div>
            </div>
          </div>
        </div>

      {/* Bar chart stretched version */}
<div className={styles.chartCard}>
  <h2>Pregnant Users by Month</h2>
  <div
    style={{
      marginTop: "40px",       
      width: "100%",              
      height: "400px",            
      maxWidth: "900px",          
      alignSelf: "center",        
    }}
  >
    <Bar data={barData} options={barOptions} />
  </div>
</div>


      </div>
    </div>
  );
};

export default Dashboard;
