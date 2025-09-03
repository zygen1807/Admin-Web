import React, { useEffect, useState } from 'react';
import { FaUser, FaMapMarkerAlt, FaFileAlt, FaBell } from 'react-icons/fa';
import styles from './Dashboard.module.css';
import { getDocs, collection, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path if needed

const Dashboard = () => {
  const [pregnantUsersCount, setPregnantUsersCount] = useState(0);
  const [locationTrackedCount, setLocationTrackedCount] = useState(0);
  const [trimesterCount, setTrimesterCount] = useState(0);
  const [reportsGenerated, setReportsGenerated] = useState(0);

  useEffect(() => {
    // Fetch pregnant_users count
    const fetchPregnantUsers = async () => {
      const snapshot = await getDocs(collection(db, 'pregnant_users'));
      setPregnantUsersCount(snapshot.size);
    };

    // Fetch pregnant_locations count
    const fetchLocationTracked = async () => {
      const snapshot = await getDocs(collection(db, 'pregnant_locations'));
      setLocationTrackedCount(snapshot.size);
    };

    // Fetch pregnant_trimester count for 3rd Trimester only
    const fetchTrimester = async () => {
      const trimesterQuery = query(
        collection(db, 'pregnant_trimester'),
        where('trimester', '==', '3rd Trimester')
      );
      const snapshot = await getDocs(trimesterQuery);
      setTrimesterCount(snapshot.size);
    };

    // Fetch Reports Generated count
    const fetchReportsGenerated = async () => {
      const countDocRef = doc(db, 'report_stats', 'generated');
      const docSnap = await getDoc(countDocRef);
      if (docSnap.exists()) {
        setReportsGenerated(docSnap.data().count || 0);
      }
    };

    fetchPregnantUsers();
    fetchLocationTracked();
    fetchTrimester();
    fetchReportsGenerated();
  }, []);

  const stats = [
    { label: 'Total Pregnant Women', value: pregnantUsersCount, icon: <FaUser />, changeType: 'positive' },
    { label: 'Total of Active Location-Tracked Pregnant Women', value: locationTrackedCount,  icon: <FaMapMarkerAlt />, changeType: 'positive' },
    { label: 'Reports Generated', value: reportsGenerated, icon: <FaFileAlt />, changeType: 'positive' },
    { label: 'Total Pregnant Women for 3rd Trimester', value: trimesterCount, icon: <FaBell />, changeType: 'negative' },
  ];

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.cards}>
        {stats.map((item, index) => (
          <div key={index} className={styles.card}>
            <div className={styles.cardHeader}>
              <p>{item.label}</p>
              <span>{item.icon}</span>
            </div>
            <h2 className={styles.cardValue}>{item.value}</h2>
            <p className={item.changeType === 'positive' ? styles.positive : styles.negative}>
              {item.change}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

