import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './AdminNotificationWatcher.module.css';

const AdminNotificationWatcher = () => {
  const [show, setShow] = useState(false);
  const [notif, setNotif] = useState(null);
  const navigate = useNavigate();
  const audioRef = useRef(null);

  useEffect(() => {
    // ✅ Preload the sound
    audioRef.current = new Audio('/notif.mp3');
    audioRef.current.load();

    // ✅ Add a click listener to enable audio (solves autoplay restrictions)
    const enableSound = () => {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      window.removeEventListener('click', enableSound);
    };
    window.addEventListener('click', enableSound);

    // ✅ Watch for Firestore updates
    const q = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setNotif(data);
        setShow(true);

        // 🔊 Play sound once notification appears
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch((err) => {
            console.warn('Sound play blocked:', err);
          });
        }
      }
    });

    return () => unsub();
  }, []);

  const handleOk = () => {
    setShow(false);
    navigate('/app/AdminNotifications');
  };

  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>🚨 New Notification</h2>
        <p>{notif?.message || 'You have a new alert.'}</p>
        <button onClick={handleOk}>OK</button>
      </div>
    </div>
  );
};

export default AdminNotificationWatcher;
