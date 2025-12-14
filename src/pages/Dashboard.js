import React, { useEffect, useState } from 'react';
import { FaUser, FaUserSlash, FaClock, FaBaby } from 'react-icons/fa';
import styles from './Dashboard.module.css';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';

import { Bar, Doughnut, Line } from 'react-chartjs-2';
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

const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'long', // full month name
    day: 'numeric',
    year: 'numeric',
  });
};


const Dashboard = () => {
  const [pregnantUsersCount, setPregnantUsersCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [dueWeekCount, setDueWeekCount] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [allPregnantUsers, setAllPregnantUsers] = useState([]);
  const [filteredTrimesterData, setFilteredTrimesterData] = useState({
    first: 0,
    second: 0,
    third: 0,
  });

  const [dueWeekPerMonth, setDueWeekPerMonth] = useState(new Array(12).fill(0));
  const [postpartumPerMonth, setPostpartumPerMonth] = useState(new Array(12).fill(0));
const [currentDateTime, setCurrentDateTime] = useState(new Date());
const [activeCard, setActiveCard] = useState(null); // holds label of the clicked card
const [tableData, setTableData] = useState([]);


  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'pregnant_users'));
        setPregnantUsersCount(usersSnap.size);

        const inactiveSnap = await getDocs(collection(db, 'pregnant_inactive'));
        setInactiveCount(inactiveSnap.size);

        const dueWeekQuery = query(collection(db, 'pregnant_trimester'), where('weeks', '>=', 36));
        const dueWeekSnap = await getDocs(dueWeekQuery);
        setDueWeekCount(dueWeekSnap.size);

        const deliveredSnap = await getDocs(collection(db, 'done_pregnants'));
        setDeliveredCount(deliveredSnap.size);

        const allUsers = usersSnap.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.(),
          }))
          .filter(user => !!user.createdAt);
        setAllPregnantUsers(allUsers);

        const trimesterSnapAll = await getDocs(collection(db, 'pregnant_trimester'));
        let trimesterCounts = { first: 0, second: 0, third: 0 };
        trimesterSnapAll.forEach(doc => {
          const t = doc.data().trimester;
          if (t === '1st Trimester') trimesterCounts.first++;
          else if (t === '2nd Trimester') trimesterCounts.second++;
          else if (t === '3rd Trimester') trimesterCounts.third++;
        });
        setFilteredTrimesterData(trimesterCounts);

        // Calculate Due Week Pregnant per month
        let dueMonthCounts = new Array(12).fill(0);
        dueWeekSnap.forEach(doc => {
          const createdAt = doc.data().updatedAt?.toDate?.();
          if (createdAt) {
            const month = createdAt.getMonth();
            dueMonthCounts[month] += 1;
          }
        });
        setDueWeekPerMonth(dueMonthCounts);

        // Calculate Postpartum per month
        let postpartumMonthCounts = new Array(12).fill(0);
        deliveredSnap.forEach(doc => {
          const createdAt = doc.data().deliveredAt?.toDate?.();
          if (createdAt) {
            const month = createdAt.getMonth();
            postpartumMonthCounts[month] += 1;
          }
        });
        setPostpartumPerMonth(postpartumMonthCounts);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
  const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
  return () => clearInterval(timer);
}, []);


  const stats = [
    { label: 'Total Active Pregnant Women', value: pregnantUsersCount, icon: <FaUser />, colorClass: styles.gradientBlue },
    { label: 'Total Inactive Pregnant Women', value: inactiveCount, icon: <FaUserSlash />, colorClass: styles.gradientGray },
    { label: 'Pregnant Women in Due Week', value: dueWeekCount, icon: <FaClock />, colorClass: styles.gradientYellow },
    { label: 'Delivered Pregnant Women', value: deliveredCount, icon: <FaBaby />, colorClass: styles.gradientPink },
  ];

const groupedBarData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  datasets: [
    {
      label: 'Pregnant Users',
      data: allPregnantUsers.reduce((acc, user) => {
        const month = user.createdAt?.getMonth() ?? 0;
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, new Array(12).fill(0)),
      backgroundColor: 'rgba(59,130,246,0.8)',
      barThickness: 30,         // 👈 MAKE BAR THICKER
      maxBarThickness: 40,       // 👈 LIMIT
    },
    {
      label: 'Due Week Pregnant',
      data: dueWeekPerMonth,
      backgroundColor: 'rgba(253,224,71,0.8)',
      barThickness: 30,
      maxBarThickness: 40,
    },
    {
      label: 'Postpartum',
      data: postpartumPerMonth,
      backgroundColor: 'rgba(236,72,153,0.8)',
      barThickness: 30,
      maxBarThickness: 40,
    },
  ],
};


  // ✅ Updated: Add datalabels above each bar
  const groupedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
   plugins: {
  legend: { display: true, position: 'bottom' },
  tooltip: { mode: 'index', intersect: false },
  datalabels: {
    display: true, // 👈 make numbers visible
    color: '#ffffffff', // 👈 change number color (e.g. black)
    anchor: 'end',
    align: 'start',
    font: {
      weight: 'bold',
      size: 14,
    },
    formatter: (value) => (value > 0 ? value : ''), // hides zeros
  },
},

    scales: {
      x: { title: { display: true, text: 'Month' }, grid: { display: false } },
      y: { title: { display: true, text: 'No. of Users' }, beginAtZero: true, ticks: { stepSize: 1 } },
    },
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

  const formatDateTime = (date) => {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const handleCardClick = async (label) => {
  // Toggle logic: if same card clicked, hide table
  if (activeCard === label) {
    setActiveCard(null);
    setTableData([]);
    return;
  }

  setActiveCard(label); // show table for this card

  let collectionName = '';
  if (label === 'Total Active Pregnant Women') collectionName = 'pregnant_users';
  else if (label === 'Total Inactive Pregnant Women') collectionName = 'pregnant_inactive';
  else if (label === 'Pregnant Women in Due Week') collectionName = 'pregnant_trimester';
  else if (label === 'Delivered Pregnant Women') collectionName = 'done_pregnants';

  if (!collectionName) return;

  try {
    const snap = await getDocs(collection(db, collectionName));
    const list = await Promise.all(
      snap.docs.map(async (docItem) => {
        const data = docItem.data();

        // Always fetch the pregnant_users record if not coming from there
        let userData = {};
        if (collectionName !== 'pregnant_users') {
          const userSnap = await getDocs(
            query(collection(db, 'pregnant_users'), where('id', '==', docItem.id))
          );
          if (!userSnap.empty) {
            userData = userSnap.docs[0].data();
          }
        } else {
          userData = data;
        }

        // Fetch trimester data if exists
        let lmp = data.lmp || userData.lmp || null;
        let edc = data.edc || userData.edc || null;

        if (!lmp || !edc) {
          const trimesterSnap = await getDocs(
            query(collection(db, 'pregnant_trimester'), where('patientId', '==', docItem.id))
          );
          const trimesterData = trimesterSnap.docs[0]?.data();
          lmp = lmp || trimesterData?.lmp || null;
          edc = edc || trimesterData?.edc || null;
        }

        return {
          id: docItem.id,
          name: userData.name || data.name || 'N/A',
          address: userData.address || data.address || 'N/A',
          birthDate: userData.birthDate || userData.birthdate || data.birthDate || 'N/A',
          age: userData.age || data.age || 'N/A',
          phoneNumber: userData.phone || data.phone || 'N/A',
          lmp: lmp,
          edc: edc,
        };
      })
    );

    setTableData(list);
  } catch (err) {
    console.error('Error fetching table data:', err);
    setTableData([]);
  }
};

  return (
    <div className={styles.dashboard}>
      <div className={styles.cardFull}>
      <div className={styles.dateTimeContainer}>
  <div className={styles.dateTimeWidget}>
    <span className={styles.dateText}>
      {currentDateTime.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })}
    </span>
    <span className={styles.timeText}>
      {currentDateTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </span>
  </div>
</div>


      {/* ✅ Gradient Cards */}
      <div className={styles.cards}>
  {stats.map((item, index) => (
    <div
      key={index}
      className={`${styles.card} ${item.colorClass}`}
      onClick={() => handleCardClick(item.label)} // 👈 add this
      style={{ cursor: 'pointer' }}
    >
      <div className={styles.cardHeader}>
        <p>{item.label}</p>
        <span>{item.icon}</span>
      </div>
      <h2 className={styles.cardValue}>{item.value}</h2>
    </div>
  ))}
</div>

{activeCard && (
    <div className={styles.modal}>
      <div className={styles.modalHeader}>
        <h2>{activeCard}</h2>
        <button onClick={() => setActiveCard(null)} className={styles.closeBtn}>✕</button>
      </div>

      <table className={styles.dataTable}>
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
          </tr>
        </thead>
        <tbody>
          {tableData.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                No records found.
              </td>
            </tr>
          ) : (
            tableData.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.name || 'N/A'}</td>
                <td>{item.address || 'N/A'}</td>
                <td>{item.birthDate ? formatDate(item.birthDate) : 'N/A'}</td>
                <td>{item.age || 'N/A'}</td>
                <td>{item.phoneNumber || 'N/A'}</td>
                <td>{item.lmp ? formatDate(item.lmp) : 'N/A'}</td>
                <td>{item.edc ? formatDate(item.edc) : 'N/A'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
 
)}

      {/* ✅ Analytics Section */}
      <div className={styles.chartsSection}>

        {/* ✅ Pregnant Trimester Distribution */}
        <div className={styles.pieChartCard}>
          <h2>Pregnant Trimester Distribution</h2>
          <div style={{ height: '300px' }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>

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



        <div className={styles.chartCard}>
          <h2>Pregnant Users, Due Week & Postpartum Per Month</h2>
          <div style={{ height: '400px', marginTop: '40px' }}>
            {/* ✅ Add plugin for datalabels */}
            <Bar data={groupedBarData} options={groupedBarOptions} plugins={[ChartDataLabels]} />
          </div>
        </div>

      </div>
    </div>
</div>
  );
};

export default Dashboard;
