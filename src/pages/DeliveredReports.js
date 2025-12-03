import React, { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import styles from "./Reports.module.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const DeliveredReports = () => {
  const [deliveredUsers, setDeliveredUsers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
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
    const fetchDelivered = async () => {
      try {
        const deliveredSnap = await getDocs(collection(db, "done_pregnants"));
        const list = [];

        for (let docSnap of deliveredSnap.docs) {
          const user = { id: docSnap.id, ...docSnap.data() };

          const userDoc = await getDoc(doc(db, "pregnant_users", user.id));
          const userData = userDoc.exists() ? userDoc.data() : {};

          const trimesterSnap = await getDocs(
            query(
              collection(db, "pregnant_trimester"),
              where("patientId", "==", user.id)
            )
          );
          const trimesterData = trimesterSnap.docs[0]?.data();

          list.push({
            id: user.id,
            name: userData.name || "—",
            address: userData.address || "—",
            birthDate: formatDate(userData.birthDate),
            age: userData.age || "—",
            phone: userData.phone || "—",
            lmp: userData.lmp ? formatDate(userData.lmp) : "N/A",
            edc: trimesterData?.edc ? formatDate(trimesterData.edc) : "N/A",
            centerName: user.center_name || "—",
            deliveredAt: user.deliveredAt
              ? formatDate(
                  user.deliveredAt?.toDate
                    ? user.deliveredAt.toDate()
                    : user.deliveredAt
                )
              : "N/A",
            deliveredAtRaw:
              user.deliveredAt?.toDate?.() ??
              new Date(user.deliveredAt) ??
              null,
          });
        }

        setDeliveredUsers(list);
      } catch (err) {
        console.error("Error loading delivered list:", err);
      }
    };

    fetchDelivered();
  }, []);

  const filteredDelivered = deliveredUsers.filter((u) => {
    if (!selectedMonth) return true;
    if (!u.deliveredAtRaw) return false;
    const month = String(u.deliveredAtRaw.getMonth() + 1).padStart(2, "0");
    return month === selectedMonth;
  });

  // apply search filter after month filter
  const displayedDelivered = filteredDelivered.filter((u) => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.address || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q)
    );
  });

  // ============================
  // ⭐ NEW PDF FORMAT (MATCHES YOUR IMAGE)
  // ============================
  const generateDeliveredPdf = () => {
    if (displayedDelivered.length === 0) return;

    const doc = new jsPDF("landscape", "mm", "a4");
    const pageWidth = doc.internal.pageSize.width; // ⭐ correct width for perfect centering

    doc.setFont("Times", "Bold");
    doc.setFontSize(12);

    // ⭐ HEADER (Proper Centered)
    doc.text("Province of Occidental Mindoro", pageWidth / 2, 12, { align: "center" });
    doc.text("Municipality of San Jose", pageWidth / 2, 18, { align: "center" });
    doc.text("DELIVERED PREGNANT REPORT", pageWidth / 2, 24, { align: "center" });

    // ⭐ Use Selected Month
    const monthLabel = selectedMonth ? monthNames[selectedMonth] : "ALL MONTHS";
    const yearLabel = new Date().getFullYear();
    doc.text(`${monthLabel} ${yearLabel}`, pageWidth / 2, 30, { align: "center" });

    // ⭐ TABLE DATA
    const tableData = displayedDelivered.map((u, i) => [
      i + 1,
      u.name,
      u.address,
      u.birthDate,
      u.age,
      u.phone,
      u.lmp,
      u.edc,
      u.centerName,
      u.deliveredAt,
    ]);

    autoTable(doc, {
      startY: 45,
      head: [
        [
          "No.",
          "Name",
          "Address",
          "Birthdate",
          "Age",
          "Phone",
          "LMP",
          "EDC",
          "Center Name",
          "Date Delivered",
        ],
      ],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 9,
        halign: "left", // ⭐ LEFT ALIGN TABLE CONTENT
        lineWidth: 0.3,
        cellPadding: 1.5,
      },
      headStyles: {
        fillColor: false,
        textColor: 0,
        lineWidth: 0.3,
        halign: "center", // header remains centered
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 }, // No.
      },
    });

    // ⭐ FOOTER SIGNATURE WITH PERFECT CENTERED UNDERLINES
    let finalY = doc.lastAutoTable.finalY + 18;

    doc.setFont("Times", "Bold");
    doc.setFontSize(12);

    // -------------------------------------
    // 1. MIDWIFE SIGNATURE (CENTERED)
    // -------------------------------------
    let midwifeName = "CHERRY ANN B. BALMES, RM";
    let midwifeX = 20;     // left boundary of signature area
    let midwifeWidth = 70; // width of signature area box

    let midwifeCenter = midwifeX + midwifeWidth / 2;
    let midwifeTextWidth = doc.getTextWidth(midwifeName);
    let midwifeTextStart = midwifeCenter - midwifeTextWidth / 2;

    // Print name centered in area
    doc.text(midwifeName, midwifeTextStart, finalY);

    // Underline centered
    doc.line(
      midwifeCenter - midwifeTextWidth / 2,
      finalY + 2,
      midwifeCenter + midwifeTextWidth / 2,
      finalY + 2
    );

    doc.setFont("Times", "Normal");
    doc.text("Rural Health Midwife", midwifeCenter - 20, finalY + 7);

    // -------------------------------------
    // 2. DOCTOR SIGNATURE 1 (CENTERED)
    // -------------------------------------
    doc.setFont("Times", "Bold");

    let doc1Name = "JENILYN F. LOMOCSO, MD";
    let doc1X = 110;
    let doc1Width = 80;

    let doc1Center = doc1X + doc1Width / 2;
    let doc1TextWidth = doc.getTextWidth(doc1Name);
    let doc1TextStart = doc1Center - doc1TextWidth / 2;

    doc.text(doc1Name, doc1TextStart, finalY);

    doc.line(
      doc1Center - doc1TextWidth / 2,
      finalY + 2,
      doc1Center + doc1TextWidth / 2,
      finalY + 2
    );

    doc.setFont("Times", "Normal");
    doc.text("Municipal Health Officer", doc1Center - 22, finalY + 7);

    // -------------------------------------
    // 3. DOCTOR SIGNATURE 2 (CENTERED)
    // -------------------------------------
    doc.setFont("Times", "Bold");

    let doc2Name = "EMELYN M. GABAO";
    let doc2X = 205;
    let doc2Width = 80;

    let doc2Center = doc2X + doc2Width / 2;
    let doc2TextWidth = doc.getTextWidth(doc2Name);
    let doc2TextStart = doc2Center - doc2TextWidth / 2;

    doc.text(doc2Name, doc2TextStart, finalY);

    doc.line(
      doc2Center - doc2TextWidth / 2,
      finalY + 2,
      doc2Center + doc2TextWidth / 2,
      finalY + 2
    );

    doc.setFont("Times", "Normal");
    doc.text("BHW Coordinator", doc2Center - 16, finalY + 7);

    doc.save("delivered_pregnant_report.pdf");
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardFull}>
        <h1>Delivered Pregnant Women</h1>

        <div
          className={styles.filterContainer}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}
        >
          {/* left: Search + Month */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                  width: 260,
                }}
              />
              <FaSearch style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            </div>

            <label>Select Month:</label>
            <select
              className={styles.filterSelect}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          {/* right: Generate button */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={generateDeliveredPdf}
              style={{
                background: "#27ae60",
                color: "#fff",
                padding: "6px 10px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                
              }}
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
              <th>LMP</th>
              <th>EDC</th>
              <th>Center</th>
              <th>Date Delivered</th>
            </tr>
          </thead>

          <tbody>
            {displayedDelivered.map((u, i) => (
              <tr key={u.id}>
                <td>{i + 1}</td>
                <td>{u.name}</td>
                <td>{u.address}</td>
                <td>{u.birthDate}</td>
                <td>{u.age}</td>
                <td>{u.phone}</td>
                <td>{u.lmp}</td>
                <td>{u.edc}</td>
                <td>{u.centerName}</td>
                <td>{u.deliveredAt}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {displayedDelivered.length === 0 && (
          <p style={{ textAlign: "center", marginTop: "20px" }}>
            No delivered records found for the selected month.
          </p>
        )}
      </div>
    </div>
  );
};

export default DeliveredReports;
