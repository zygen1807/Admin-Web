import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase'; // your Firestore config file
import './AdminNotifications.css';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="notif-container">
      <h2>Admin Notifications</h2>
      <table className="notif-table">
  <thead>
    <tr>
      <th>Rescuer</th>
      <th>Patient</th>
      <th>Message</th>
      <th>Date</th>
    </tr>
  </thead>
  <tbody>
    {notifications.length > 0 ? (
      notifications.map((n) => (
        <tr key={n.id}>
          <td>{n.rescuerName || 'Unknown'}</td>
          <td>{n.patientName}</td>
          <td>{n.message}</td>
          <td>
            {n.deliveredAt?.toDate
              ? n.deliveredAt.toDate().toLocaleString()
              : 'Pending'}
          </td>
        </tr>
      ))
    ) : (
      <tr>
        <td colSpan={4} className="empty-cell">
          No notifications yet.
        </td>
      </tr>
    )}
  </tbody>
</table>

    </div>
  );
}
