// LaborStatusReports.js
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import styles from "./Reports.module.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaSearch } from "react-icons/fa";

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
  const [searchTerm, setSearchTerm] = useState("");

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

        // 2. Fetch pregnant users
        const usersSnap = await getDocs(collection(db, "pregnant_users"));
        const usersMap = {};
        usersSnap.docs.forEach(docSnap => {
          usersMap[docSnap.id] = {
            name: docSnap.data().name || "—",
            address: docSnap.data().address || "—",
            phone: docSnap.data().phone || "—",
          };
        });

        // 3. Merge
        const list = statusList.map(status => ({
          ...status,
          name: usersMap[status.patientId]?.name || "—",
          address: usersMap[status.patientId]?.address || "—",
          phone: usersMap[status.patientId]?.phone || "—",
        }));

        setUsers(list);
      } catch (err) {
        console.error("Error loading LaborStatus data:", err);
      }
    };

    fetchData();
  }, []);

  // ---------------- FILTERING ----------------
  const filteredUsers = users
    .filter((u) => {
      if (selectedMonth) {
        const month = String(u.createdAt.getMonth() + 1).padStart(2, "0");
        if (month !== selectedMonth) return false;
      }
      if (statusFilter !== "ALL") {
        const level = (u.emergencyLevel || "").toLowerCase();
        if (statusFilter === "Normal")
          return level.includes("normal");
        if (statusFilter === "Risk")
          return level.includes("risk") && !level.includes("high");
        if (statusFilter === "High Risk")
          return level.includes("high");
        return true;
      }
      return true;
    })
    .filter((u) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.address.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
      );
    });

  const getEmergencyColor = (level) => {
    if (!level) return "#000";
    const l = level.toLowerCase();
    if (l.includes("normal")) return "#27ae60";
    if (l.includes("risk") && !l.includes("high")) return "#f1c40f";
    if (l.includes("high")) return "#e74c3c";
    return "#000";
  };

  // ---------------- PDF GENERATION ----------------
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
          else if (val.includes("risk") && !val.includes("high"))
            data.cell.styles.textColor = [241, 196, 15];
          else if (val.includes("high"))
            data.cell.styles.textColor = [231, 76, 60];
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

        {/* ---------------- FILTER AREA ---------------- */}
        {/* TOP FILTER ROW */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {/* LEFT GROUP → Search + Month */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* SEARCH BAR */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "8px 32px 8px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  width: 260,
                }}
              />
              <FaSearch
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                }}
              />
            </div>

            {/* MONTH FILTER moved to LEFT */}
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
          </div>

          {/* RIGHT GROUP → Status Filter + PDF Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            {/* EMERGENCY LEVEL FILTER */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label htmlFor="emergencySelect">Emergency Level:</label>
              <select
                id="emergencySelect"
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="Normal">Normal</option>
                <option value="Risk">Risk</option>
                <option value="High Risk">High Risk</option>
              </select>
            </div>

            {/* PDF BUTTON */}
            <button
              onClick={generatePdf}
              style={{
                background: "#27ae60",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}
            >
              🡇 Generate Report
            </button>
          </div>
        </div>

        {/* ---------------- TABLE ---------------- */}
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
                <td style={{ fontWeight: "bold", color: getEmergencyColor(u.emergencyLevel) }}>
                  {u.emergencyLevel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <p style={{ textAlign: "center", marginTop: "20px" }}>
            No labor status records found.
          </p>
        )}
      </div>
    </div>
  );
};

export default LaborStatusReports;
