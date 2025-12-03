// TotalPregnant.js
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
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

const TotalPregnant = () => {
  const [users, setUsers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date);
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
        snap.forEach((docSnap) => {
          const user = { id: docSnap.id, ...docSnap.data() };
          let createdAt = user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt)) : null;
          list.push({
            id: user.id,
            name: user.name || "—",
            address: user.address || "—",
            birthDate: formatDate(user.birthDate),
            age: user.age || "—",
            phone: user.phone || "—",
            createdAt,
          });
        });
        setUsers(list);
      } catch (err) {
        console.error("Error fetching TotalPregnant data:", err);
      }
    };

    fetchData();
  }, []);

  // Filter by month
  const filteredUsers = users.filter((u) => {
    if (!selectedMonth) return true;
    if (!u.createdAt) return false;
    const month = String(u.createdAt.getMonth() + 1).padStart(2, "0");
    return month === selectedMonth;
  });

  // apply search filter after month filter
  const displayedUsers = filteredUsers.filter((u) => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.address || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q)
    );
  });

  const generatePdf = () => {
    if (displayedUsers.length === 0) return;

    const doc = new jsPDF("landscape", "mm", "a4");
    const topMargin = 25.4; // 1 inch
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFont("Times", "Bold");
    doc.setFontSize(12);
    doc.text("Province of Occidental Mindoro", pageWidth / 2, topMargin, { align: "center" });
    doc.text("Municipality of San Jose", pageWidth / 2, topMargin + 6, { align: "center" });
    doc.text("TOTAL PREGNANT REPORT", pageWidth / 2, topMargin + 12, { align: "center" });

    const monthLabel = selectedMonth ? monthNames[selectedMonth] : "ALL MONTHS";
    const yearLabel = new Date().getFullYear();
    doc.text(`${monthLabel} ${yearLabel}`, pageWidth / 2, topMargin + 18, { align: "center" });

    const tableData = displayedUsers.map((u, i) => [
      i + 1,
      u.name,
      u.address,
      u.birthDate,
      u.age,
      u.phone,
      u.createdAt ? u.createdAt.toLocaleDateString() : "N/A",
    ]);

    autoTable(doc, {
      startY: topMargin + 25,
      head: [["No.", "Name", "Address", "Birthdate", "Age", "Phone", "Registered Date"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 9, halign: "left", lineWidth: 0.3, cellPadding: 1.5 },
      headStyles: { fillColor: false, textColor: 0, lineWidth: 0.3, halign: "center" },
      columnStyles: { 0: { halign: "center", cellWidth: 12 } },
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

    doc.save("total_pregnant_report.pdf");
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
        <h1>Total Pregnant Women</h1>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          {/* left group: Search + Month */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search name, address, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "8px 32px 8px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  width: 300,
                }}
              />
              <FaSearch style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "#efefef", cursor: "pointer" }}
              >
                Clear
              </button>
            )}

            <label htmlFor="monthSelect">Select Month:</label>
            <select
              id="monthSelect"
              className={styles.filterSelect}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All</option>
              {monthOrder.map((m) => (
                <option key={m} value={m}>{monthNames[m]}</option>
              ))}
            </select>
          </div>

          {/* right group: Generate button */}
          <div>
            <button
              onClick={generatePdf}
              style={{ background: "#27ae60", color: "#fff", padding: "6px 10px", borderRadius: "4px", border: "none", cursor: "pointer" }}
            >
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
              <th>Registered Date</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map((u, i) => (
               <tr key={u.id}>
                 <td>{i + 1}</td>
                 <td>{u.name}</td>
                 <td>{u.address}</td>
                 <td>{u.birthDate}</td>
                 <td>{u.age}</td>
                 <td>{u.phone}</td>
                 <td>{u.createdAt ? u.createdAt.toLocaleDateString() : "N/A"}</td>
               </tr>
             ))}
           </tbody>
         </table>

        {displayedUsers.length === 0 && <p style={{ textAlign: "center", marginTop: "20px" }}>No records found for the selected month & search.</p>}
      </div>
    </div>
  );
};

export default TotalPregnant;
