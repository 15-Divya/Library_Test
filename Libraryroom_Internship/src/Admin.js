// AdminPanel.js
import {
  setDoc,
  doc,
  collection,
  onSnapshot,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import "./Admin.css";
import { db, auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [idInputs, setIdInputs] = useState([""]);
  const [newPurpose, setNewPurpose] = useState("");
  const [newDuration, setNewDuration] = useState("1 hour");
  const [newRoom, setNewRoom] = useState("Discussion Room");
  const [editRowId, setEditRowId] = useState(null);
  const [editData, setEditData] = useState({});
  const [exportType, setExportType] = useState("all");
  const [userEmail, setUserEmail] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("All");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
      } else {
        setUserEmail(user.email);
      }
    });
    return unsub;
  }, [navigate]);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "requests"), (snap) => {
      setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, "approved"), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
      setApproved(items);
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setApproved((prev) => [...prev]); // re-trigger render
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Try again.");
    }
  };

  const calculateEndTime = (timestamp, duration) => {
    const map = { "0.5 hours": 30, "1 hour": 60, "1.5 hours": 90 };
    const end = new Date(timestamp);
    end.setMinutes(end.getMinutes() + (map[duration] || 0));
    return end;
  };

  const handleAction = async (entry, action) => {
    if (action === "agree") {
      const ids =
        Array.isArray(entry.allIds) && entry.allIds.length
          ? entry.allIds.filter((id) => id?.trim())
          : [entry.hostId || entry.ID || "Unknown"];
      if (!ids.length) return alert("No valid IDs");

      const now = new Date().toISOString();
      const batch = ids.map((id, i) => ({
  ID: id,
  Role: i === 0 ? "Host" : `Member ${i}`,
  Room: entry.room || "Discussion Room",
  PC: entry.pc || "",
  Purpose: entry.purpose || "-",
  Duration: entry.duration || "1 hour",
  Timestamp: now,
  SourceRequestID: entry.id,
}));

      try {
        for (const rec of batch) await addDoc(collection(db, "approved"), rec);
        await deleteDoc(doc(db, "requests", entry.id));
      } catch (e) {
        console.error(e);
        alert("Approval failed");
      }
    } else {
      await deleteDoc(doc(db, "requests", entry.id));
    }
  };

  const handleAddPatron = async () => {
    const ids = idInputs.map((id) => id.trim()).filter(Boolean);
    const invalidIds = ids.filter((id) => !/^\d{7}$/.test(id));
    if (!ids.length || !newPurpose.trim())
      return alert("Enter valid ID(s) and purpose");
    if (invalidIds.length > 0) return alert("Each ID must be exactly 7 digits");

    const now = new Date().toISOString();
   const batch = ids.map((id, i) => ({
  ID: id,
  Role: i === 0 ? "Manual" : `Member ${i}`,
  Room: newRoom,
  Purpose: newPurpose.trim(),
  Duration: newDuration,
  Timestamp: now,
}));

    try {
      for (const rec of batch) await addDoc(collection(db, "approved"), rec);
      setShowAddForm(false);
      setIdInputs([""]);
      setNewPurpose("");
      setNewDuration("1 hour");
      setNewRoom("Discussion Room");
    } catch (e) {
      console.error(e);
      alert("Add failed");
    }
  };

  const handleEdit = (entry) => {
    setEditRowId(entry.id);
    setEditData({
      ID: entry.ID,
      Purpose: entry.Purpose,
      Duration: entry.Duration,
      Timestamp: entry.Timestamp,
    });
  };

  const handleEditChange = (field, val) => {
    setEditData((prev) => ({ ...prev, [field]: val }));
  };

  const saveInlineEdit = async (entry) => {
    try {
      const updated = {
        ...entry,
        ...editData,
        Timestamp: new Date(editData.Timestamp).toISOString(),
        ID: editData.ID || entry.ID,
      };
      await setDoc(doc(db, "approved", entry.id), updated);
      setEditRowId(null);
    } catch (e) {
      console.error(e);
      alert("Save failed");
    }
  };

  const handleRemove = async (entry) => {
    if (!entry.id) return alert("No ID");
    try {
      await deleteDoc(doc(db, "approved", entry.id));
    } catch (e) {
      console.error(e);
      alert("Remove failed");
    }
  };

  const exportToExcel = () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    let data = approved;
    if (exportType === "day") {
      data = data.filter(
        (e) => new Date(e.Timestamp).toDateString() === now.toDateString()
      );
    } else if (exportType === "yesterday") {
      data = data.filter(
        (e) => new Date(e.Timestamp).toDateString() === yesterday.toDateString()
      );
    } else if (exportType === "month") {
      data = data.filter((e) => {
        const d = new Date(e.Timestamp);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    } else if (exportType === "custom") {
      if (!customStartDate || !customEndDate) {
        return alert("Please select both start and end dates.");
      }
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999); // Include entire day
      data = data.filter((e) => {
        const t = new Date(e.Timestamp);
        return t >= start && t <= end;
      });
    }

    if (!data.length) return alert("No data to export");

    const clean = data.map(({ id, ...rest }) => ({
      ...rest,
      Date: new Date(rest.Timestamp).toLocaleDateString(),
      InTime: new Date(rest.Timestamp).toLocaleTimeString(),
      OutTime: new Date(
        calculateEndTime(rest.Timestamp, rest.Duration)
      ).toLocaleTimeString(),
    }));

    const ws = XLSX.utils.json_to_sheet(clean);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Approved");
    XLSX.writeFile(wb, `Approved_Bookings_${exportType}.xlsx`);
  };

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const filteredApproved = approved
    .filter((entry) => {
      const ts = new Date(entry.Timestamp);
      const matchesDate =
        exportType === "day"
          ? ts.toDateString() === now.toDateString()
          : exportType === "yesterday"
          ? ts.toDateString() === yesterday.toDateString()
          : exportType === "month"
          ? ts.getMonth() === now.getMonth() &&
            ts.getFullYear() === now.getFullYear()
          : exportType === "custom"
          ? (() => {
              if (!customStartDate || !customEndDate) return true;
              const start = new Date(customStartDate);
              const end = new Date(customEndDate);
              end.setHours(23, 59, 59, 999);
              return ts >= start && ts <= end;
            })()
          : true;

      const matchesRoom = selectedRoom === "All" || entry.Room === selectedRoom;

      return matchesDate && matchesRoom;
    })

    .sort((a, b) => {
      const aStart = new Date(a.Timestamp);
      const bStart = new Date(b.Timestamp);
      const aEnd = calculateEndTime(a.Timestamp, a.Duration);
      const bEnd = calculateEndTime(b.Timestamp, b.Duration);
      const aActive = aStart <= now && now <= aEnd;
      const bActive = bStart <= now && now <= bEnd;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return aStart - bStart;
    });

  return (
    <div className="admin-body">
      <div className="sidebar">
        <h2>Admin</h2>
        <p>👤 {userEmail}</p>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
        <div className="notifications">
          <h4>Notifications</h4>
          <ul>
            {pending.map((e, i) => (
              <li key={i}>
                🟡 {e.ID || e.hostId} requested — {e.purpose}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="main-content">
        {pending.length ? (
          <div className="admin-controls">
  <p>
    {pending[0].room} requested. Approve?
  </p>

  <p>
    <strong>Host ID:</strong> {pending[0].hostId}
  </p>

  {pending[0].room === "Discussion Room" &&
    Array.isArray(pending[0].allIds) &&
    pending[0].allIds.length > 1 && (
      <p>
        <strong>Member IDs:</strong>{" "}
        {pending[0].allIds.slice(1).join(", ")}
      </p>
    )}

  <div className="admin-controls-buttons">
    <button
      className="agree"
      onClick={() => handleAction(pending[0], "agree")}
    >
      Agree
    </button>

    <button
      className="disagree"
      onClick={() => handleAction(pending[0], "disagree")}
    >
      Disagree
    </button>
  </div>
</div>
        ) : (
          <div className="admin-controls">
            <p>No new requests.</p>
          </div>
        )}

        <div className="admin-actions">
          <button onClick={() => setShowAddForm(true)}>Add Patron</button>

          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
          >
            <option value="All">All Rooms</option>
            <option value="Discussion Room">Discussion Room</option>
            <option value="E-Resource">E-Resource Room</option> {/* FIXED */}
          </select>

          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
          >
            <option value="all">All</option>
            <option value="day">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          {exportType === "custom" && (
            <div className="custom-date-range">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}
          <button onClick={exportToExcel}>Export Logs</button>
        </div>

        {showAddForm && (
          <div className="admin-form">
            <div className="multi-id-inputs">
              {idInputs.map((id, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`ID ${idx + 1}`}
                  value={id}
                  onChange={(e) => {
                    const updated = [...idInputs];
                    const val = e.target.value;
                    if (/^\d{0,7}$/.test(val)) {
                      updated[idx] = val;
                      setIdInputs(updated);
                    }
                  }}
                />
              ))}
              <button
                type="button"
                className="small-btn"
                onClick={() => setIdInputs([...idInputs, ""])}
                disabled={idInputs.length >= 6}
              >
                + Add ID
              </button>
            </div>

            <input
              type="text"
              placeholder="Purpose"
              value={newPurpose}
              onChange={(e) => setNewPurpose(e.target.value)}
            />
            <select
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
            >
              <option>0.5 hours</option>
              <option>1 hour</option>
              
            </select>
            <select
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
            >
              <option>Discussion</option>
              <option>E‑Resource</option>
            </select>
            <button className="small-btn" onClick={handleAddPatron}>
              Save
            </button>
            <button className="small-btn" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>

           
          </div>
        )}

        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Role</th>
                <th>Room</th>
                <th>PC</th>
                <th>Purpose</th>
                <th>Duration</th>
                <th>Date</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApproved.map((e, i) => {
                const isEditing = editRowId === e.id;
                const endTime = calculateEndTime(
                  isEditing ? editData.Timestamp : e.Timestamp,
                  isEditing ? editData.Duration : e.Duration
                );
                const isExpired = new Date() > endTime;

                return (
                  <tr
                    key={i}
                    className={isExpired ? "expired-row" : "active-row"}
                  >
                    <td>
                      {isEditing ? (
                        <input
                          value={editData.ID}
                          onChange={(ev) => {
                            const val = ev.target.value;
                            if (/^\d{0,7}$/.test(val)) {
                              handleEditChange("ID", val);
                            }
                          }}
                        />
                      ) : (
                        e.ID
                      )}
                    </td>
                    <td>{e.Role}</td>
                    <td>{e.Room}</td>
                    <td>{e.PC || "-"}</td>
                    <td>
                      {isEditing ? (
                        <input
                          value={editData.Purpose}
                          onChange={(ev) =>
                            handleEditChange("Purpose", ev.target.value)
                          }
                        />
                      ) : (
                        e.Purpose
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editData.Duration}
                          onChange={(ev) =>
                            handleEditChange("Duration", ev.target.value)
                          }
                        >
                          <option>0.5 hours</option>
                          <option>1 hour</option>
                          
                        </select>
                      ) : (
                        e.Duration
                      )}
                    </td>
                    <td>{new Date(e.Timestamp).toLocaleDateString()}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="datetime-local"
                          value={editData.Timestamp.slice(0, 16)}
                          onChange={(ev) =>
                            handleEditChange("Timestamp", ev.target.value)
                          }
                        />
                      ) : (
                        new Date(e.Timestamp).toLocaleTimeString()
                      )}
                    </td>
                    <td>{endTime.toLocaleTimeString()}</td>
                    <td>
                      {isEditing ? (
                        <>
                          <button
                            className="light-btn"
                            onClick={() => saveInlineEdit(e)}
                          >
                            Save
                          </button>
                          <button
                            className="light-btn"
                            onClick={() => setEditRowId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="light-btn"
                            onClick={() => handleEdit(e)}
                          >
                            Edit
                          </button>
                          <button
                            className="remove-btn"
                            onClick={() => handleRemove(e)}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
