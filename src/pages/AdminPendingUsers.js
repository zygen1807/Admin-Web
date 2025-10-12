import React, { useEffect, useState } from "react";
import "./AdminPendingUsers.css";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom"; // react-router-dom navigation

export default function AdminPendingUsers() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    const pendingSnapshot = await getDocs(collection(db, "pending_users"));
    const verifiedSnapshot = await getDocs(collection(db, "pregnant_users"));
    const declinedSnapshot = await getDocs(collection(db, "declined_users"));

    const fetched = [];

    pendingSnapshot.forEach((d) =>
      fetched.push({ id: d.id, ...d.data(), status: "Pending" })
    );
    verifiedSnapshot.forEach((d) =>
      fetched.push({ id: d.id, ...d.data(), status: "Verified" })
    );
    declinedSnapshot.forEach((d) =>
      fetched.push({ id: d.id, ...d.data(), status: "Not Verified" })
    );

    // Sort: Pending first, Verified next, Not Verified last
    fetched.sort((a, b) => {
      const statusOrder = { Pending: 1, Verified: 2, "Not Verified": 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    setUsers(fetched);
  };

  const confirmUser = async (user) => {
    await setDoc(doc(db, "pregnant_users", user.id), {
      ...user,
      approved: true,
      status: "Verified",
      verifiedAt: new Date(),
    });
    await deleteDoc(doc(db, "pending_users", user.id));
    fetchUsers();
  };

  const declineUser = async (user) => {
    await setDoc(doc(db, "declined_users", user.id), {
      ...user,
      approved: false,
      status: "Not Verified",
      declinedAt: new Date(),
    });
    await deleteDoc(doc(db, "pending_users", user.id));
    fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case "Pending":
        return { backgroundColor: "#FFC107", color: "#000" }; // amber
      case "Verified":
        return { backgroundColor: "#4CAF50", color: "#fff" }; // green
      case "Not Verified":
        return { backgroundColor: "#F44336", color: "#fff" }; // red
      default:
        return {};
    }
  };

  return (
    <div className="admin-container">
     <h2 style={{ color: "#d81b60" }}>Pregnant User Account Activation</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
            <th>Address</th>
            <th>Phone</th>
            <th>Email</th>
            <th>LMP</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="9">No accounts found</td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.age}</td>
                <td>{u.address}</td>
                <td>{u.phone}</td>
                <td>{u.email}</td>
                <td>{u.lmp || "—"}</td>
                <td style={getStatusStyle(u.status)}>{u.status}</td>
                <td>
                  {u.createdAt
                    ? new Date(u.createdAt.seconds * 1000).toLocaleString()
                    : "—"}
                </td>
                <td>
                  {u.status === "Pending" ? (
                    <>
                      <button
                        className="confirm"
                        onClick={() => confirmUser(u)}
                      >
                        Confirm
                      </button>
                      <button
                        className="decline"
                        onClick={() => declineUser(u)}
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
