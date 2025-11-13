// Archived_Records.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './Reports.module.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Archived_Records = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [checkupRecords, setCheckupRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Fetch patients with archived checkup records
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const snap = await getDocs(collection(db, 'pregnant_users'));
        const list = [];

        for (const docSnap of snap.docs) {
          const user = { id: docSnap.id, ...docSnap.data() };

          const archiveSnap = await getDocs(
            collection(db, 'checkup_record', user.id, 'archived_records')
          );

          if (!archiveSnap.empty) {
            const archives = archiveSnap.docs.map((a) => ({
              id: a.id,
              label: 'Archive Records',
            }));
            list.push({ ...user, archives });
          }
        }

        setPatients(list);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching patients:', err);
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Open archive and fetch all checkup records for display
  const openArchiveModal = async (patient, archive) => {
    setSelectedPatient(patient);

    try {
      const recSnap = await getDocs(
        collection(db, 'checkup_record', patient.id, archive.id)
      );

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
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setCheckupRecords(recData);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching checkup records:', err);
      setCheckupRecords([]);
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPatient(null);
    setCheckupRecords([]);
  };

  const handleGeneratePdf = () => {
    if (!selectedPatient || checkupRecords.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(
      'Prenatal Checkup Record',
      doc.internal.pageSize.getWidth() / 2,
      15,
      { align: 'center' }
    );

    const info = [
      ['NAME:', selectedPatient.patientName || selectedPatient.name || ''],
      ['ADDRESS:', selectedPatient.address || ''],
      ['AGE:', selectedPatient.age || ''],
      ['PHONE:', selectedPatient.phone || ''],
      ['LMP:', selectedPatient.lmp || ''],
      ['EDC:', selectedPatient.edc || ''],
    ];

    let y = 25;
    info.forEach(([label, value]) => {
      doc.text(label, 14, y);
      doc.text(value, 45, y);
      y += 6;
    });

    const headers = ['Field', ...checkupRecords.map((r) => r.date)];
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

    doc.save(
      `${(selectedPatient.patientName || selectedPatient.name)
        .replace(/\s+/g, '_')}_checkup_record.pdf`
    );
  };

  if (loading) return <div className={styles.loader}>Loading archived records...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
        <h2>Archived Checkup Records</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Pregnant Name</th>
              <th>Address</th>
              <th>Age</th>
              <th>Phone</th>
              <th>LMP</th>
              <th>EDC</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center' }}>
                  No archived records found.
                </td>
              </tr>
            )}
            {patients.map((p, idx) => (
              <tr key={p.id}>
                <td>{idx + 1}</td>
                <td>{p.patientName || p.name}</td>
                <td>{p.address}</td>
                <td>{p.age || '—'}</td>
                <td>{p.phone || '—'}</td>
                <td>{p.lmp || '—'}</td>
                <td>{p.edc || '—'}</td>
                <td>
                  {p.archives.length > 0 ? (
                    <select
                      onChange={(e) => {
                        const selectedArchive = p.archives.find(
                          (a) => a.id === e.target.value
                        );
                        if (selectedArchive) openArchiveModal(p, selectedArchive);
                      }}
                    >
                      <option value="">Select Archive</option>
                      {p.archives.map((a) => (
                        <option key={a.id} value={a.id}>
                          Archive Records
                        </option>
                      ))}
                    </select>
                  ) : (
                    'No Archives'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showModal && selectedPatient && (
          <div className={styles.modalOverlay}>
            <div className={styles.landscapeModal}>
              <button onClick={closeModal} className={styles.closeBtn}>
                ✕
              </button>

              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
                Checkup Records
              </h3>

              <div style={{ marginBottom: '20px', lineHeight: '1.8' }}>
                <div>
                  <strong>NAME:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>
                    {selectedPatient.patientName || selectedPatient.name}
                  </span>
                </div>
                <div>
                  <strong>ADDRESS:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>
                    {selectedPatient.address}
                  </span>
                </div>
                <div>
                  <strong>AGE:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>
                    {selectedPatient.age || ' '}
                  </span>
                </div>
                <div>
                  <strong>PHONE:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>
                    {selectedPatient.phone || ' '}
                  </span>
                </div>
                <div>
                  <strong>LMP:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>
                    {selectedPatient.lmp || ' '}
                  </span>
                </div>
                <div>
                  <strong>EDC:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>
                    {selectedPatient.edc || ' '}
                  </span>
                </div>
              </div>

              <button
                onClick={handleGeneratePdf}
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
                      <th>Field</th>
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

export default Archived_Records;
