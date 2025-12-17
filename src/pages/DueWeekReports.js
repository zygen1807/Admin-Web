// DueWeekReports.js
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
import { FaSearch } from "react-icons/fa";

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

const DueWeekReports = () => {
  const [users, setUsers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

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
  const isWithinDueWeek = (edc) => {
    if (!edc) return false;
    const dueDate = edc.toDate ? edc.toDate() : new Date(edc);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setDate(end.getDate() + 7);

    return dueDate >= today && dueDate <= end;
  };

  const fetchDueWeekUsers = async () => {
    try {
      // 1️⃣ Fetch ALL trimester records ONCE
      const trimesterSnap = await getDocs(
        collection(db, "pregnant_trimester")
      );

      // 2️⃣ Filter due-week by EDC (same as dashboard)
      const dueWeekDocs = trimesterSnap.docs.filter(doc =>
        isWithinDueWeek(doc.data().edc)
      );

      if (dueWeekDocs.length === 0) {
        setUsers([]);
        return;
      }

      const patientIds = dueWeekDocs.map(d => d.data().patientId);

      // 3️⃣ Fetch users in parallel
      const userSnaps = await Promise.all(
        patientIds.map(id =>
          getDocs(
            query(
              collection(db, "pregnant_users"),
              where("__name__", "==", id)
            )
          )
        )
      );

      const userMap = new Map();
      userSnaps.forEach(snap => {
        if (!snap.empty) {
          userMap.set(snap.docs[0].id, snap.docs[0].data());
        }
      });

      // 4️⃣ Fetch latest checkup in parallel
      const checkupSnaps = await Promise.all(
        patientIds.map(id =>
          getDocs(
            query(
              collection(db, "checkup_record", id, "records"),
              orderBy("date", "desc"),
              limit(1)
            )
          )
        )
      );

      const checkupMap = new Map();
      checkupSnaps.forEach((snap, index) => {
        checkupMap.set(
          patientIds[index],
          snap.docs[0]?.data()?.riskAssessment || "Normal"
        );
      });

      // 5️⃣ Build final list
      const list = dueWeekDocs.map(docSnap => {
        const trimester = docSnap.data();
        const uid = trimester.patientId;
        const user = userMap.get(uid);
        if (!user) return null;

        return {
          id: uid,
          name: user.name || "—",
          address: user.address || "—",
          phone: user.phone || "—",
          lmp: formatDate(trimester.lmp),
          edc: formatDate(trimester.edc),
          weeks: trimester.weeks || 0,
          latestUpdate: trimester.updatedAt?.toDate?.() || null,
          healthStatus: checkupMap.get(uid) || "Normal",
        };
      }).filter(Boolean);

      setUsers(list);
    } catch (err) {
      console.error("Error fetching due week users:", err);
    }
  };

  fetchDueWeekUsers();
}, []);

  // ➤ APPLY FILTERS
  const filteredUsers = users
    .filter((u) => {
      if (selectedMonth) {
        if (!u.latestUpdate) return false;
        const month = String(u.latestUpdate.getMonth() + 1).padStart(2, "0");
        if (month !== selectedMonth) return false;
      }
      if (statusFilter !== "ALL") {
        return u.healthStatus?.toLowerCase() === statusFilter.toLowerCase();
      }
      return true;
    })
    .filter((u) => {
      const q = searchTerm.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.address.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
      );
    });

  const getStatusColor = (status) => {
    if (!status) return "#000";
    const s = status.toLowerCase();
    if (s === "normal") return "#27ae60";
    if (s === "risk") return "#f1c40f";
    if (s === "high risk") return "#e74c3c";
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
    doc.text("DUE WEEK PREGNANT REPORT", pageWidth / 2, 24, { align: "center" });

    const monthLabel = selectedMonth ? monthNames[selectedMonth] : "ALL MONTHS";
    const yearLabel = new Date().getFullYear();
    doc.text(`${monthLabel} ${yearLabel}`, pageWidth / 2, 30, { align: "center" });

    const tableData = filteredUsers.map((u, i) => [
      i + 1,
      u.name,
      u.address,
      u.phone,
      u.lmp,
      u.edc,
      u.weeks,
      u.healthStatus,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["No.", "Name", "Address", "Phone", "LMP", "EDC", "Weeks", "Health Status"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 9, halign: "left", lineWidth: 0.3, cellPadding: 1.5 },
      headStyles: { fillColor: false, textColor: 0, lineWidth: 0.3, halign: "center" },
      columnStyles: { 0: { halign: "center", cellWidth: 12 } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 7) {
          const val = (data.cell.raw || "").toLowerCase();
          if (val === "normal") data.cell.styles.textColor = [39, 174, 96];
          else if (val === "risk") data.cell.styles.textColor = [241, 196, 15];
          else if (val === "high risk") data.cell.styles.textColor = [231, 76, 60];
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

    signatures.forEach((sig) => {
      doc.setFont("Times", "Bold");
      const nameX = sig.x + sig.width / 2 - doc.getTextWidth(sig.name) / 2;
      doc.text(sig.name, nameX, finalY);
      doc.line(sig.x, finalY + 2, sig.x + sig.width, finalY + 2);

      doc.setFont("Times", "Normal");
      const titleX = sig.x + sig.width / 2 - doc.getTextWidth(sig.title) / 2;
      doc.text(sig.title, titleX, finalY + 7);
    });

    doc.save("due_week_report.pdf");
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
        <h1>Due Week Pregnant Women</h1>

        {/* FILTERS: left (Search + Month) and right (Health Status + Generate) */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 16 }}>
            {/* LEFT: Search + Month */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

            {/* RIGHT: Health Status + Generate (aligned like HealthStatus.js) */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              </div>

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
        </div>

        {/* TABLE */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>LMP</th>
              <th>EDC</th>
              <th>Weeks</th>
              <th>Health Status</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u, i) => (
              <tr key={u.id}>
                <td>{i + 1}</td>
                <td>{u.name}</td>
                <td>{u.address}</td>
                <td>{u.phone}</td>
                <td>{u.lmp}</td>
                <td>{u.edc}</td>
                <td>{u.weeks}</td>
                <td style={{ fontWeight: "bold", color: getStatusColor(u.healthStatus) }}>
                  {u.healthStatus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <p style={{ textAlign: "center", marginTop: "20px" }}>No records found for the selected filter.</p>
        )}
      </div>
    </div>
  );
};

export default DueWeekReports;
