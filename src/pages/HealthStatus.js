// HealthStatus.js
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import styles from "./Reports.module.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const monthOrder = ["01","02","03","04","05","06","07","08","09","10","11","12"];

const monthNames = {
  "01": "January",
  "02": "February",
  "03": "March",
  "04": "April",
  "05": "May",
  "06": "June",
  "07": "July",
  "08": "August",
  "09": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

const HealthStatus = () => {
  const [users, setUsers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const formatDate = (date) => {
    if (!date) return "N/A";
    const d =
      date instanceof Date
        ? date
        : date?.toDate
        ? date.toDate()
        : new Date(date);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const list = [];
        const snap = await getDocs(collection(db, "pregnant_users"));

        for (let docSnap of snap.docs) {
          const user = { id: docSnap.id, ...docSnap.data() };

          // fetch trimester info
          const trimesterSnap = await getDocs(
            query(
              collection(db, "pregnant_trimester"),
              where("patientId", "==", user.id)
            )
          );
          const trimester = trimesterSnap.docs[0]?.data();

          // fetch latest checkup record
          const checkupSnap = await getDocs(
            query(
              collection(db, "checkup_record", user.id, "records"),
              orderBy("date", "desc"),
              limit(1)
            )
          );

          const checkup = checkupSnap.docs[0]?.data();

          let latestCheckupDate = null;
          if (checkup?.date) {
            latestCheckupDate =
              typeof checkup.date.toDate === "function"
                ? checkup.date.toDate()
                : new Date(checkup.date);
          }

          list.push({
            id: user.id,
            name: user.name || "—",
            address: user.address || "—",
            birthDate: formatDate(user.birthDate),
            age: user.age || "—",
            phone: user.phone || "—",
            lmp: trimester?.lmp ? formatDate(trimester.lmp) : "N/A",
            edc: trimester?.edc ? formatDate(trimester.edc) : "N/A",
            riskFactor: checkup?.riskFactor || "—",
            healthStatus: checkup?.riskAssessment || "Normal",
            latestCheckupDate,
          });
        }

        setUsers(list);
      } catch (err) {
        console.error("Error loading HealthStatus data:", err);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (selectedMonth) {
      if (!u.latestCheckupDate) return false;
      const month = String(u.latestCheckupDate.getMonth() + 1).padStart(2, "0");
      if (month !== selectedMonth) return false;
    }
    if (statusFilter === "ALL") return true;
    return u.healthStatus?.toLowerCase() === statusFilter.toLowerCase();
  });

  const getStatusColor = (status) => {
    if (!status) return "#000";
    const s = status.toLowerCase();
    if (s === "normal") return "#27ae60"; // green
    if (s === "risk") return "#f1c40f"; // yellow
    if (s === "high risk") return "#e74c3c"; // red
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
    doc.text("HEALTH STATUS REPORT", pageWidth / 2, 24, { align: "center" });

    const monthLabel = selectedMonth ? monthNames[selectedMonth] : "ALL MONTHS";
    const yearLabel = new Date().getFullYear();
    doc.text(`${monthLabel} ${yearLabel}`, pageWidth / 2, 30, { align: "center" });

    const tableData = filteredUsers.map((u, i) => [
      i + 1,
      u.name,
      u.address,
      u.birthDate,
      u.age,
      u.phone,
      u.lmp,
      u.edc,
      u.riskFactor,
      u.healthStatus,
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["No.", "Name", "Address", "Birthdate", "Age", "Phone", "LMP", "EDC", "Risk Factor", "Health Status"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 9, halign: "left", lineWidth: 0.3, cellPadding: 1.5 },
      headStyles: { fillColor: false, textColor: 0, lineWidth: 0.3, halign: "center" },
      columnStyles: { 0: { halign: "center", cellWidth: 12 } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 9) {
          const val = (data.cell.raw || "").toLowerCase();
          if (val === "normal") data.cell.styles.textColor = [39, 174, 96];
          else if (val === "risk") data.cell.styles.textColor = [241, 196, 15];
          else if (val === "high risk") data.cell.styles.textColor = [231, 76, 60];
          else data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const finalY = doc.lastAutoTable.finalY + 18;

    // Footer signatures
    const signatures = [
      { name: "CHERRY ANN B. BALMES, RM", title: "Rural Health Midwife", x: 20, width: 70 },
      { name: "JENILYN F. LOMOCSO, MD", title: "Municipal Health Officer", x: 110, width: 80 },
      { name: "EMELYN M. GABAO", title: "BHW Coordinator", x: 205, width: 80 },
    ];

    signatures.forEach((sig) => {
      doc.setFont("Times", "Bold");
      doc.text(sig.name, sig.x + sig.width / 2 - doc.getTextWidth(sig.name) / 2, finalY);
      doc.line(sig.x, finalY + 2, sig.x + sig.width, finalY + 2);
      doc.setFont("Times", "Normal");
      doc.text(sig.title, sig.x + sig.width / 2 - doc.getTextWidth(sig.title) / 2, finalY + 7);
    });

    doc.save("health_status_report.pdf");
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
        <h1>Pregnant Health Status</h1>

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
  {monthOrder.map((m) => (
    <option key={m} value={m}>
      {monthNames[m]}
    </option>
  ))}
</select>

          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
  <label htmlFor="statusSelect">Health Status:</label>
  <select
    id="statusSelect"
    className={styles.filterSelect}
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
  >
    <option value="ALL">All</option>
    <option value="Normal">Normal</option>
    <option value="Risk">Risk</option>
    <option value="High Risk">High Risk</option>
  </select>
  <button onClick={generatePdf} style={{ background: "#27ae60", color: "#fff", padding: "6px 10px", borderRadius: "4px", border: "none", cursor: "pointer" }}>
              🡇 Generate Report
            </button>
</div>

        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Address</th>
              <th>Birthdate</th>
              <th>Age</th>
              <th>Phone</th>
              <th>LMP</th>
              <th>EDC</th>
              <th>Risk Factor</th>
              <th>Health Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, i) => (
              <tr key={u.id}>
                <td>{i + 1}</td>
                <td>{u.name}</td>
                <td>{u.address}</td>
                <td>{u.birthDate}</td>
                <td>{u.age}</td>
                <td>{u.phone}</td>
                <td>{u.lmp}</td>
                <td>{u.edc}</td>
                <td>{u.riskFactor}</td>
                <td style={{ fontWeight: "bold", color: getStatusColor(u.healthStatus) }}>{u.healthStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && <p style={{ textAlign: "center", marginTop: "20px" }}>No records found for the selected filter.</p>}
      </div>
    </div>
  );
};

export default HealthStatus;
