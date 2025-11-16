// LaborStatusReports.js
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import styles from "./Reports.module.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const monthOrder = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const monthNames = {
  "01": "January","02": "February","03": "March","04": "April",
  "05": "May","06": "June","07": "July","08": "August",
  "09": "September","10": "October","11": "November","12": "December",
};

const LaborStatusReports = () => {
  const [users, setUsers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch all labor status documents
        const statusSnap = await getDocs(collection(db, "pregnant_status"));
        const statusList = statusSnap.docs.map(docSnap => {
          const data = docSnap.data();
          const answers = data.answers || {};
          return {
            id: docSnap.id,
            patientId: data.patientId,
            babyMovement: answers.babyMovement || "—",
            bleeding: answers.bleeding || "—",
            contractions: answers.contractions || "—",
            headache: answers.headache || "—",
            waterBroken: answers.waterBroken || "—",
            notes: data.notes || "—",
            emergencyLevel: data.emergencyLevel || "Normal Emergency",
            createdAt: data.createdAt?.toDate?.() || new Date(0),
          };
        });

        // 2. Fetch all pregnant users
        const usersSnap = await getDocs(collection(db, "pregnant_users"));
        const usersMap = {};
        usersSnap.docs.forEach(docSnap => {
          usersMap[docSnap.id] = {
            name: docSnap.data().name || "—",
            address: docSnap.data().address || "—"
          };
        });

        // 3. Merge: Map patientId to Name & Address
        const list = statusList.map(status => {
          const userInfo = usersMap[status.patientId] || { name: "—", address: "—" };
          return {
            ...status,
            name: userInfo.name,
            address: userInfo.address,
          };
        });

        setUsers(list);
      } catch (err) {
        console.error("Error loading LaborStatus data:", err);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = users.filter(u => {
    // Month filter
    if (selectedMonth) {
      if (!u.createdAt) return false;
      const month = String(u.createdAt.getMonth() + 1).padStart(2, "0");
      if (month !== selectedMonth) return false;
    }
    // Emergency filter
    if (statusFilter === "ALL") return true;
    return u.emergencyLevel?.toLowerCase() === statusFilter.toLowerCase();
  });

  const getEmergencyColor = (level) => {
    if (!level) return "#000";
    const l = level.toLowerCase();
    if (l.includes("normal")) return "#27ae60"; // green
    if (l.includes("risk") && !l.includes("high")) return "#f1c40f"; // yellow
    if (l.includes("high")) return "#e74c3c"; // red
    return "#000";
  };

  const generatePdf = () => {
    if (filteredUsers.length === 0) return;

    const doc = new jsPDF("landscape", "mm", "a4");
    const pageWidth = doc.internal.pageSize.width;

    doc.setFont("Times", "Bold");
    doc.setFontSize(12);
    doc.text("Province of Occidental Mindoro", pageWidth / 2, 12, { align: "center" });
    doc.text("Municipality of San Jose", pageWidth / 2, 18, { align: "center" });
    doc.text("LABOR STATUS REPORT", pageWidth / 2, 24, { align: "center" });

    const monthLabel = selectedMonth ? monthNames[selectedMonth] : "ALL MONTHS";
    const yearLabel = new Date().getFullYear();
    doc.setFont("Times", "Normal");
    doc.setFontSize(12);
    doc.text(`${monthLabel} ${yearLabel}`, pageWidth / 2, 30, { align: "center" });

    const tableData = filteredUsers.map((u, i) => [
      i + 1,
      u.name,
      u.address,
      u.babyMovement,
      u.bleeding,
      u.contractions,
      u.headache,
      u.waterBroken,
      u.notes,
      u.emergencyLevel
    ]);

    autoTable(doc, {
      startY: 36,
      head: [["No.","Name","Address","Baby Movement","Bleeding","Contractions","Headache","Water Broken","Notes","Emergency Level"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 9, halign: "left", cellPadding: 1.5, lineWidth: 0.3 },
      headStyles: { fillColor: false, textColor: 0, halign: "center", lineWidth: 0.3 },
      columnStyles: { 0: { halign: "center", cellWidth: 12 } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 9) {
          const val = (data.cell.raw || "").toLowerCase();
          if (val.includes("normal")) data.cell.styles.textColor = [39, 174, 96];
          else if (val.includes("risk") && !val.includes("high")) data.cell.styles.textColor = [241, 196, 15];
          else if (val.includes("high")) data.cell.styles.textColor = [231, 76, 60];
          else data.cell.styles.textColor = [0,0,0];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const finalY = doc.lastAutoTable.finalY + 18;

    const signatures = [
      { name: "CHERRY ANN B. BALMES, RM", title: "Rural Health Midwife", x: 20, width: 70 },
      { name: "JENILYN F. LOMOCSO, MD", title: "Municipal Health Officer", x: 110, width: 80 },
      { name: "EMELYN M. GABAO", title: "BHW Coordinator", x: 205, width: 80 },
    ];

    signatures.forEach(sig => {
      doc.setFont("Times", "Bold");
      doc.text(sig.name, sig.x + sig.width / 2 - doc.getTextWidth(sig.name) / 2, finalY);
      doc.line(sig.x, finalY + 2, sig.x + sig.width, finalY + 2);
      doc.setFont("Times", "Normal");
      doc.text(sig.title, sig.x + sig.width / 2 - doc.getTextWidth(sig.title) / 2, finalY + 7);
    });

    doc.save("labor_status_report.pdf");
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
        <h1>Labor Status Reports</h1>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label htmlFor="monthSelect">Select Month:</label>
            <select
              id="monthSelect"
              className={styles.filterSelect}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All</option>
              {monthOrder.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label htmlFor="statusSelect">Emergency Level:</label>
            <select
              id="statusSelect"
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="Normal Emergency">Normal Emergency</option>
              <option value="Risk Emergency">Risk Emergency</option>
              <option value="High-Risk Emergency">High-Risk Emergency</option>
            </select>
          </div>

          <button
            onClick={generatePdf}
            style={{ background: "#27ae60", color: "#fff", padding: "6px 12px", borderRadius: "4px", border: "none", cursor: "pointer" }}
          >
            🡇 Generate Report
          </button>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Address</th>
              <th>Baby Movement</th>
              <th>Bleeding</th>
              <th>Contractions</th>
              <th>Headache</th>
              <th>Water Broken</th>
              <th>Notes</th>
              <th>Emergency Level</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, i) => (
              <tr key={u.id}>
                <td>{i + 1}</td>
                <td>{u.name}</td>
                <td>{u.address}</td>
                <td>{u.babyMovement}</td>
                <td>{u.bleeding}</td>
                <td>{u.contractions}</td>
                <td>{u.headache}</td>
                <td>{u.waterBroken}</td>
                <td>{u.notes}</td>
                <td style={{ fontWeight: "bold", color: getEmergencyColor(u.emergencyLevel) }}>{u.emergencyLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && <p style={{ textAlign: "center", marginTop: "20px" }}>No labor status records found.</p>}
      </div>
    </div>
  );
};

export default LaborStatusReports;
