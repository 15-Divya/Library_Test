// AdminPanel.js
import {
  setDoc,
  doc,
  collection,
  onSnapshot,
  deleteDoc,
  addDoc,
  getDocs,
  updateDoc,
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
  // Special Booking states
// const [showSpecialForm, setShowSpecialForm] = useState(false);
// const [specialStudentId, setSpecialStudentId] = useState("");
// const [specialRoom, setSpecialRoom] = useState("Discussion Room 1");
// const [specialMemberIds, setSpecialMemberIds] = useState([""]);
// const [specialPC, setSpecialPC] = useState("");
// const [specialPurpose, setSpecialPurpose] = useState("");
// const [specialDuration, setSpecialDuration] = useState("1 hour");
  const [idInputs, setIdInputs] = useState([""]);
  const [newPurpose, setNewPurpose] = useState("");
  const [newDuration, setNewDuration] = useState("1 hour");
  const [newRoom, setNewRoom] = useState("Discussion Room 1");
  const [newBookingDate, setNewBookingDate] = useState("");
  const [newBookingTime, setNewBookingTime] = useState("");
  const [editRowId, setEditRowId] = useState(null);
  const [editData, setEditData] = useState({});
  //const [exportType, setExportType] = useState("all");
  const [exportType, setExportType] = useState("day");
  const [userEmail, setUserEmail] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("All");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [newEndTime, setNewEndTime] = useState("");

  const convertToDate = (value) => {
  if (!value) return null;

  const date =
    typeof value.toDate === "function"
      ? value.toDate()
      : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

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
      items.sort((a, b) => {
  const dateA = convertToDate(a.Timestamp) || new Date(0);
  const dateB = convertToDate(b.Timestamp) || new Date(0);

  return dateA - dateB;
});
      setApproved(items);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);

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

  const calculateEndTime = (timestamp, duration, savedEndTime) => {
    if (savedEndTime) {
      const savedDate =
        typeof savedEndTime.toDate === "function"
          ? savedEndTime.toDate()
          : new Date(savedEndTime);

      if (!Number.isNaN(savedDate.getTime())) return savedDate;
    }

    const startDate =
      timestamp && typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    const map = {
      "0.5 hours": 30,
      "1 hour": 60,
      "1.5 hours": 90,
    };

    const end = new Date(startDate);
    end.setMinutes(end.getMinutes() + (map[duration] || 0));

    return end;
  };


  
const getDurationMinutes = (entry) => {

  // If Early Logout was performed, calculate actual time used
  if (entry.EarlyLogout === true) {
    const start = convertToDate(entry.Timestamp);
    const end = convertToDate(entry.EndTimestamp);

    if (start && end) {
      return Math.max(0, (end - start) / 60000);
    }
  }

  if (entry.Duration === "Custom") {
    const start = convertToDate(entry.Timestamp);
    const end = convertToDate(entry.EndTimestamp);

    if (start && end) {
      return Math.max(0, (end - start) / 60000);
    }

    return 0;
  }

  const durationMap = {
    "0.5 hours": 30,
    "1 hour": 60,
    "1.5 hours": 90,
  };

  return durationMap[entry.Duration] || 0;
};




  const toLocalDateTimeInput = (value) => {
    const date =
      value && typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const offset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
  };

  

const handleAction = async (entry, action) => {
  if (action === "agree") {
    const ids =
      Array.isArray(entry.allIds) && entry.allIds.length
        ? entry.allIds.filter((id) => id?.trim())
        : [entry.hostId || entry.ID || "Unknown"];

    if (!ids.length) {
      alert("No valid IDs");
      return;
    }

   /*  const submittedTime = entry.bookingStart
      ? typeof entry.bookingStart.toDate === "function"
        ? entry.bookingStart.toDate().toISOString()
        : new Date(entry.bookingStart).toISOString()
      : new Date().toISOString(); */

      const submittedTime = new Date().toISOString();

    try {
      for (let i = 0; i < ids.length; i++) {
        await addDoc(collection(db, "approved"), {
          ID: ids[i],
          Role: i === 0 ? "Host" : `Member ${i}`,
          Room: entry.room,
          PC: entry.pc || "",
          Purpose: entry.purpose || "",
          Duration: entry.duration || "1 hour",
          Timestamp: submittedTime,
          SourceRequestID: entry.id,
        });
      }

      await deleteDoc(doc(db, "requests", entry.id));
    } catch (e) {
      console.error("Approval failed:", e);
      alert("Approval failed. Please try again.");
    }
  } else {
    await deleteDoc(doc(db, "requests", entry.id));
  }
};


  const handleAddPatron = async () => {
    const ids = idInputs.map((id) => id.trim()).filter(Boolean);
    /*const invalidIds = ids.filter((id) => !/^\d{7}$/.test(id));*/

    if (!ids.length || !newPurpose.trim()) {
      return alert("Enter valid ID(s) and purpose");
    }

   /* if (invalidIds.length > 0) {
      return alert("Each ID must be exactly 7 digits");
    }*/

   if (!newBookingDate || !newBookingTime || !newEndTime) {
  return alert("Please select booking date, In Time and Out Time.");
}

const bookingDateTime = new Date(
  `${newBookingDate}T${newBookingTime}:00`
);

const bookingEndDateTime = new Date(
  `${newBookingDate}T${newEndTime}:00`
);

if (bookingEndDateTime <= bookingDateTime) {
  return alert("Out Time must be later than In Time.");
}

    if (Number.isNaN(bookingDateTime.getTime())) {
      return alert("Please select a valid date and time.");
    }

    if (bookingDateTime < new Date()) {
      return alert("Please select a future booking date and time.");
    }

    const now = bookingDateTime.toISOString();
    const addedAt = new Date().toISOString();

    const manualGroupId = `manual-${Date.now()}`;

const batch = ids.map((id, i) => ({
  ID: id,
  Role: i === 0 ? "Manual" : `Member ${i}`,
  Room: newRoom,
  Purpose: newPurpose.trim(),
  Duration: "Custom",
Timestamp: bookingDateTime.toISOString(),
EndTimestamp: bookingEndDateTime.toISOString(),
  CreatedAt: addedAt,
  GroupBookingID: manualGroupId,
}));

    try {
      for (const rec of batch) {
        await addDoc(collection(db, "approved"), rec);
      }

      setShowAddForm(false);
      setIdInputs([""]);
      setNewPurpose("");
      setNewDuration("1 hour");
      setNewRoom("Discussion Room 1");
      setNewBookingDate("");
      setNewBookingTime("");
      setNewEndTime("");
    } catch (e) {
      console.error(e);
      alert("Add failed");
    }
  };

  /* const isSpecialPCBooked = (pc) => {
  const now = new Date();

  // Check pending bookings
  const pendingBooked = pending.some((data) => {
    if (data.room !== "E-Resource" || data.pc !== pc) {
      return false;
    }

    const startTime = convertToDate(data.bookingStart);
    if (!startTime || !data.durationMinutes) return false;

    const endTime = new Date(
      startTime.getTime() + data.durationMinutes * 60000
    );

    return now >= startTime && now < endTime;
  });

  // Check approved bookings
  const approvedBooked = approved.some((data) => {
    if (data.Room !== "E-Resource" || data.PC !== pc) {
      return false;
    }

    const startTime = convertToDate(data.Timestamp);
    if (!startTime) return false;

    const endTime = data.EndTimestamp
      ? convertToDate(data.EndTimestamp)
      : calculateEndTime(data.Timestamp, data.Duration);

    return endTime && now >= startTime && now < endTime;
  });

  return pendingBooked || approvedBooked;
};

  const handleSpecialBooking = async () => {
  try {
    const studentId = specialStudentId.trim();

    // 1. Validate Student ID
    if (!/^\d{7}$/.test(studentId)) {
      alert("Please enter a valid 7-digit Student ID.");
      return;
    }

    // Validate Discussion Room member IDs
const memberIds =
  specialRoom !== "E-Resource"
    ? specialMemberIds.map((id) => id.trim()).filter(Boolean)
    : [];

if (specialRoom !== "E-Resource" && memberIds.length === 0) {
  alert("Please enter at least one Member Student ID.");
  return;
}

if (memberIds.some((id) => !/^\d{7}$/.test(id))) {
  alert("Every Member Student ID must contain exactly 7 digits.");
  return;
}

const allStudentIds = [studentId, ...memberIds];

if (new Set(allStudentIds).size !== allStudentIds.length) {
  alert("Host and Member Student IDs must be different.");
  return;
}

    // 2. Validate Purpose
    if (!specialPurpose.trim()) {
      alert("Please enter the booking purpose.");
      return;
    }

    // 3. Validate PC for E-Resource
    if (specialRoom === "E-Resource" && !specialPC) {
      alert("Please select a PC.");
      return;
    }

    if (
  specialRoom === "E-Resource" &&
  isSpecialPCBooked(specialPC)
) {
  alert("This PC is already occupied. Please select another PC.");
  setSpecialPC("");
  return;
}

    const isDiscussion = [
      "Discussion Room",
      "Discussion Room 1",
      "Discussion Room 2",
    ].includes(specialRoom);

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const isToday = (value) => {
      const date = convertToDate(value);
      return (
        date &&
        date >= startOfDay &&
        date <= endOfDay
      );
    };

    // 4. Get today's pending requests and approved bookings
    const [requestSnapshot, approvedSnapshot] = await Promise.all([
      getDocs(collection(db, "requests")),
      getDocs(collection(db, "approved")),
    ]);

    const requests = requestSnapshot.docs.map((doc) => doc.data());
    const bookings = approvedSnapshot.docs.map((doc) => doc.data());

   // 5. Check normal booking eligibility for every student
for (const id of allStudentIds) {
  const normalRequestUsed = requests.some((data) => {
    if (!isToday(data.bookingStart)) return false;

    const startTime = convertToDate(data.bookingStart);
    if (!startTime) return false;

    const endTime = new Date(
      startTime.getTime() +
      (Number(data.durationMinutes) || 0) * 60000
    );

    // Booking must be completed first
    if (new Date() < endTime) return false;

    if (isDiscussion) {
      return (
        [
          "Discussion Room",
          "Discussion Room 1",
          "Discussion Room 2",
        ].includes(data.room) &&
        Array.isArray(data.allIds) &&
        data.allIds.includes(id)
      );
    }

    return data.room === "E-Resource" && data.hostId === id;
  });

  const normalApprovedUsed = bookings.some((data) => {
    if (data.SpecialBooking === true) return false;
    if (!isToday(data.Timestamp)) return false;

    const endTime = calculateEndTime(
      data.Timestamp,
      data.Duration,
      data.EndTimestamp
    );

    if (!endTime || new Date() < endTime) return false;

    if (isDiscussion) {
      return (
        [
          "Discussion Room",
          "Discussion Room 1",
          "Discussion Room 2",
        ].includes(data.Room) &&
        String(data.ID) === id
      );
    }

    return data.Room === "E-Resource" && String(data.ID) === id;
  });

  if (!normalRequestUsed && !normalApprovedUsed) {
    alert(
      `Student ID ${id} has not completed a normal booking for this room category today.`
    );
    return;
  }

  // 6. Check whether this student already has a Special Booking today
  const specialAlreadyExists = bookings.some((data) => {
    if (data.SpecialBooking !== true) return false;
    if (!isToday(data.Timestamp)) return false;
    if (String(data.ID) !== id) return false;

    if (isDiscussion) {
      return [
        "Discussion Room",
        "Discussion Room 1",
        "Discussion Room 2",
      ].includes(data.Room);
    }

    return data.Room === "E-Resource";
  });

  if (specialAlreadyExists) {
    alert(
      `Student ID ${id} has already received a Special Booking for this room category today.`
    );
    return;
  }
}

// 7. Automatically calculate booking time
const startTime = new Date();
    const endTime = new Date(startTime);

    const durationMinutes =
      specialDuration === "0.5 hours" ? 30 : 60;

    endTime.setMinutes(
      endTime.getMinutes() + durationMinutes
    );

    // 8. Save Special Booking
if (isDiscussion) {
  const specialGroupId = `special-${Date.now()}`;

  for (let i = 0; i < allStudentIds.length; i++) {
    await addDoc(collection(db, "approved"), {
      ID: allStudentIds[i],
      Role: i === 0
        ? "Special Booking Host"
        : `Special Booking Member ${i}`,
      Room: specialRoom,
      PC: "",
      Purpose: specialPurpose.trim(),
      Duration: specialDuration,
      Timestamp: startTime.toISOString(),
      EndTimestamp: endTime.toISOString(),
      SpecialBooking: true,
      GroupBookingID: specialGroupId,
      GrantedBy: userEmail,
    });
  }
} else {
  await addDoc(collection(db, "approved"), {
    ID: studentId,
    Role: "Special Booking",
    Room: specialRoom,
    PC: specialPC,
    Purpose: specialPurpose.trim(),
    Duration: specialDuration,
    Timestamp: startTime.toISOString(),
    EndTimestamp: endTime.toISOString(),
    SpecialBooking: true,
    GrantedBy: userEmail,
  });
}

    alert("Special Booking added successfully!");

    // 9. Reset the form
    setSpecialStudentId("");
    setSpecialMemberIds([""]);
    setSpecialRoom("Discussion Room 1");
    setSpecialPC("");
    setSpecialPurpose("");
    setSpecialDuration("1 hour");
    setShowSpecialForm(false);

  } catch (error) {
    console.error("Special Booking Error:", error);
    alert("Unable to create Special Booking. Please try again.");
  }
}; */


  const handleEdit = (entry) => {
    const endTime = calculateEndTime(
      entry.Timestamp,
      entry.Duration,
      entry.EndTimestamp
    );

    setEditRowId(entry.id);

    setEditData({
      ID: entry.ID || "",
      Purpose: entry.Purpose || "",
      Duration: entry.Duration || "1 hour",
      Timestamp: toLocalDateTimeInput(entry.Timestamp),
      EndTimestamp: toLocalDateTimeInput(endTime),
    });
  };

  const handleEditChange = (field, val) => {
    setEditData((prev) => ({ ...prev, [field]: val }));
  };

  const saveInlineEdit = async (entry) => {
    try {
      const startDate = new Date(editData.Timestamp);
      const endDate = new Date(editData.EndTimestamp);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        alert("Please enter a valid In Time and Out Time.");
        return;
      }

      if (endDate <= startDate) {
        alert("Out Time must be later than In Time.");
        return;
      }

      const updated = {
        ...entry,
        ...editData,
        Timestamp: startDate.toISOString(),
        EndTimestamp: endDate.toISOString(),
        ID: editData.ID || entry.ID,
      };

      await setDoc(doc(db, "approved", entry.id), updated);

      setEditRowId(null);
      setEditData({});
    } catch (e) {
      console.error("Error saving booking:", e);
      alert("Save failed. Please check the In Time and Out Time.");
    }
  };

  const handleRemove = async (entry) => {
  const ids = entry.allBookingIds || [entry.id];

  if (!window.confirm("Remove all bookings in this entry?")) {
    return;
  }

  try {
    for (const id of ids) {
      await deleteDoc(doc(db, "approved", id));
    }
  } catch (e) {
    console.error(e);
    alert("Remove failed");
  }
};


  // Early Logout for E-Resource only


const handleEarlyLogout = async (entry, booking) => {
  if (entry.Room !== "E-Resource") return;

  const now = new Date();

  // Use the individual booking's times
  const startTime = booking.start;
  const endTime = booking.end;

  if (
    !booking.id ||
    !startTime ||
    !endTime ||
    now < startTime ||
    now >= endTime ||
    booking.EarlyLogout === true
  ) {
    alert("Early Logout is available only during an active booking.");
    return;
  }

  const confirmLogout = window.confirm(
    `Are you sure you want to logout student ${entry.ID} from ${booking.PC}?`
  );

  if (!confirmLogout) return;

  try {
    const logoutTime = new Date().toISOString();

    // Update ONLY the selected booking
    await updateDoc(doc(db, "approved", booking.id), {
      EndTimestamp: logoutTime,
      EarlyLogout: true,
      EarlyLogoutAt: logoutTime,
    });

    alert("Student logged out successfully. The PC is now available.");

  } catch (error) {
    console.error("Early Logout failed:", error);
    alert("Early Logout failed. Please try again.");
  }
};


    const exportToExcel = () => {
    const now = new Date();

    const getBookingDate = (timestamp) => {
      if (!timestamp) return null;

      const date =
        typeof timestamp.toDate === "function"
          ? timestamp.toDate()
          : new Date(timestamp);

      return Number.isNaN(date.getTime()) ? null : date;
    };

    const normalizeRoom = (room) =>
      (room || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const isDiscussionRoom = (room) =>
      [
        "discussion",
        "discussionroom",
        "discussionroom1",
        "discussionroom2",
      ].includes(normalizeRoom(room));

    const isEResourceRoom = (room) =>
      ["eresource", "eresourceroom"].includes(normalizeRoom(room));

    let data =
      selectedRoom === "All"
        ? [...approved]
        : approved.filter((entry) => {
            const room = normalizeRoom(entry.Room);

            if (normalizeRoom(selectedRoom) === "discussionroom") {
              return isDiscussionRoom(entry.Room);
            }

            if (normalizeRoom(selectedRoom) === "eresourceroom") {
              return isEResourceRoom(entry.Room);
            }

            return room === normalizeRoom(selectedRoom);
          });

    if (exportType === "day") {
      data = data.filter((entry) => {
        const date = getBookingDate(entry.Timestamp);
        return date && date.toDateString() === now.toDateString();
      });
    } else if (exportType === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      data = data.filter((entry) => {
        const date = getBookingDate(entry.Timestamp);
        return date && date.toDateString() === yesterday.toDateString();
      });
    } else if (exportType === "month") {
      data = data.filter((entry) => {
        const date = getBookingDate(entry.Timestamp);

        return (
          date &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      });
    } else if (exportType === "custom") {
      if (!customStartDate || !customEndDate) {
        return alert("Please select both start and end dates.");
      }

      const start = new Date(`${customStartDate}T00:00:00`);
      const end = new Date(`${customEndDate}T23:59:59.999`);

      if (start > end) {
        return alert("Start date cannot be after end date.");
      }

      data = data.filter((entry) => {
        const date = getBookingDate(entry.Timestamp);
        return date && date >= start && date <= end;
      });
    }

    if (!data.length) {
      return alert(
        `No bookings found for ${selectedRoom} and the selected date range.`
      );
    }

    


const makeSheetData = (records) => {
  const groups = {};

  // Group bookings by Student ID, Room and Date
  records.forEach((entry) => {
    const start = getBookingDate(entry.Timestamp);
    if (!start) return;

    const dateKey = [
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    ].join("-");

    const key = [
      String(entry.ID).trim(),
      entry.Room,
      dateKey,
    ].join("_");

    const bookingEnd = calculateEndTime(
      entry.Timestamp,
      entry.Duration,
      entry.EndTimestamp
    );

    const bookingDetail = {
      PC: entry.PC || "",
      start,
      end: bookingEnd,
    };

    if (!groups[key]) {
      groups[key] = {
        ...entry,
        totalMinutes: 0,
        allPCs: [],
        bookingDetails: [],
      };
    }

    groups[key].totalMinutes += getDurationMinutes(entry);
    groups[key].bookingDetails.push(bookingDetail);

    if (entry.PC && !groups[key].allPCs.includes(entry.PC)) {
      groups[key].allPCs.push(entry.PC);
    }
  });

  return Object.values(groups).map((group) => {
    // Sort all bookings by starting time
    const bookings = [...group.bookingDetails].sort(
      (a, b) => a.start - b.start
    );

    const firstBooking = bookings[0];

    const {
      id,
      Timestamp,
      EndTimestamp,
      EarlyLogoutAt,
      EarlyLogout,
      SourceRequestID,
      CreatedAt,
      GroupBookingID,
      SpecialBooking,
      GrantedBy,
      totalMinutes,
      allPCs,
      bookingDetails,
      ...cleanData
    } = group;

    return {
      ...cleanData,

      PC: allPCs.join(", "),

      Duration: `${(totalMinutes / 60).toFixed(1)} hours`,

      Date: firstBooking
        ? firstBooking.start.toLocaleDateString("en-IN")
        : "",

      // Show every booking time in the same Excel cell
      InTime: bookings
        .map((booking) =>
          booking.start.toLocaleTimeString("en-IN")
        )
        .join("\n"),

      OutTime: bookings
        .map((booking) =>
          booking.end.toLocaleTimeString("en-IN")
        )
        .join("\n"),
    };
  });
};




    // Date-wise Summary
const dateSummary = {};

data.forEach((entry) => {
  const bookingDate = getBookingDate(entry.Timestamp);
  if (!bookingDate) return;

  const date = bookingDate.toLocaleDateString("en-IN");

  if (!dateSummary[date]) {
    dateSummary[date] = {
      Date: date,
      eResourceMembers: 0,
      discussionGroups: new Set(),
      discussionMembers: 0,
      periodicalMembers: 0,
    };
  }

  if (isEResourceRoom(entry.Room)) {
    dateSummary[date].eResourceMembers++;
  }

  if (isDiscussionRoom(entry.Room)) {
    dateSummary[date].discussionMembers++;

    const groupId =
      entry.SourceRequestID ||
      entry.GroupID ||
      `${entry.Timestamp}_${entry.Room}_${entry.Purpose}`;

    dateSummary[date].discussionGroups.add(groupId);
  }

  if (normalizeRoom(entry.Room) === "periodicalroom") {
    dateSummary[date].periodicalMembers++;
  }
});

// Generate summary according to selected room
const summaryData = Object.values(dateSummary)
  .map((item) => {
    if (selectedRoom === "E-Resource Room") {
      return {
        Date: item.Date,
        "E-Resource Members": item.eResourceMembers,
      };
    }

    if (selectedRoom === "Discussion Room") {
      return {
        Date: item.Date,
        "Discussion Groups": item.discussionGroups.size,
        "Discussion Members": item.discussionMembers,
      };
    }

    if (selectedRoom === "Periodical Room") {
      return {
        Date: item.Date,
        "Periodical Members": item.periodicalMembers,
      };
    }

    // All Rooms - keep existing summary
    return {
      Date: item.Date,
      "E-Resource Members": item.eResourceMembers,
      "Discussion Groups": item.discussionGroups.size,
      "Discussion Members": item.discussionMembers,
    };
  })
  .sort((a, b) => {
    const [ad, am, ay] = a.Date.split("/");
    const [bd, bm, by] = b.Date.split("/");
    return new Date(ay, am - 1, ad) - new Date(by, bm - 1, bd);
  });



  
    const wb = XLSX.utils.book_new();

    if (selectedRoom === "All") {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(makeSheetData(data)),
        "Approved"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          makeSheetData(data.filter((entry) => isDiscussionRoom(entry.Room)))
        ),
        "Discussion Room"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          makeSheetData(data.filter((entry) => isEResourceRoom(entry.Room)))
        ),
        "E-Resource"
      );
    } else {
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(makeSheetData(data)),
    selectedRoom === "Discussion Room"
      ? "Discussion Room"
      : selectedRoom === "Periodical Room"
      ? "Periodical Room"
      : "E-Resource"
  );
}


    // Add Date-wise Summary sheet
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.json_to_sheet(summaryData),
  "Date-wise Summary"
);

    XLSX.writeFile(
      wb,
      `Approved_Bookings_${selectedRoom.replace(/\s+/g, "_")}_${exportType}.xlsx`
    );
  };

  
const getLiveOccupancy = () => {
  const rooms = {
    "Discussion Room 1": {
      members: 0,
      groups: new Set(),
    },
    "Discussion Room 2": {
      members: 0,
      groups: new Set(),
    },
    "E-Resource": {
      members: 0,
      groups: new Set(),
    },
  };

  const activeGroups = new Map();

  // Check pending requests
  pending.forEach((entry) => {
    const room =
      entry.room === "Discussion Room"
        ? "Discussion Room 1"
        : entry.room;

    if (!rooms[room]) return;

    if (!entry.bookingStart || !entry.durationMinutes) return;

    const start =
      typeof entry.bookingStart.toDate === "function"
        ? entry.bookingStart.toDate()
        : new Date(entry.bookingStart);

    const end = new Date(
      start.getTime() + entry.durationMinutes * 60000
    );

    if (currentTime >= start && currentTime < end) {
      const groupKey = entry.id;

      activeGroups.set(groupKey, {
        room,
        members: room === "E-Resource" ? 1 : (entry.allIds?.length || 1),
      });
    }
  });

  // Check approved bookings
  const approvedGroups = new Map();

  approved.forEach((entry) => {
    const room =
      entry.Room === "Discussion Room"
        ? "Discussion Room 1"
        : entry.Room;

    if (!rooms[room]) return;
    if (!entry.Timestamp || !entry.Duration) return;

    const start =
      typeof entry.Timestamp.toDate === "function"
        ? entry.Timestamp.toDate()
        : new Date(entry.Timestamp);

    const end = calculateEndTime(
      entry.Timestamp,
      entry.Duration,
      entry.EndTimestamp
    );

    if (currentTime >= start && currentTime < end) {
      // All approved members from one request share SourceRequestID
      const groupKey =
        entry.SourceRequestID ||
        entry.GroupBookingID ||
        `${room}-${entry.Timestamp}-${entry.Purpose}-${entry.Duration}`;

      if (!approvedGroups.has(groupKey)) {
        approvedGroups.set(groupKey, {
          room,
          members: 0,
        });
      }

      approvedGroups.get(groupKey).members++;
    }
  });

  // Approved records replace their matching pending request
  approvedGroups.forEach((value, key) => {
    activeGroups.set(key, value);
  });

  // Calculate active members and groups
  activeGroups.forEach(({ room, members }, key) => {
    rooms[room].members += members;
    rooms[room].groups.add(key);
  });

  return {
    discussion1: {
      members: rooms["Discussion Room 1"].members,
      groups: rooms["Discussion Room 1"].groups.size,
    },
    discussion2: {
      members: rooms["Discussion Room 2"].members,
      groups: rooms["Discussion Room 2"].groups.size,
    },
    eResource: {
      members: rooms["E-Resource"].members,
    },
  };
};

const liveOccupancy = getLiveOccupancy();

const getDailyUsage = () => {
  const today = new Date().toDateString();

  const discussion1Groups = new Set();
  const discussion2Groups = new Set();
  const eResourceStudents = new Set();

  // Check today's pending requests
  pending.forEach((entry) => {
    const date = convertToDate(entry.bookingStart);

    if (!date || date.toDateString() !== today) return;

    const room =
      entry.room === "Discussion Room"
        ? "Discussion Room 1"
        : entry.room;

    if (room === "Discussion Room 1") {
      discussion1Groups.add(entry.id);
    } else if (room === "Discussion Room 2") {
      discussion2Groups.add(entry.id);
    } else if (room === "E-Resource") {
      if (entry.hostId) {
        eResourceStudents.add(entry.hostId);
      }
    }
  });

  // Check today's approved bookings
  approved.forEach((entry) => {
    const date = convertToDate(entry.Timestamp);

    if (!date || date.toDateString() !== today) return;

    const room =
      entry.Room === "Discussion Room"
        ? "Discussion Room 1"
        : entry.Room;

    if (room === "Discussion Room 1") {
      const groupKey =
        entry.SourceRequestID ||
        entry.GroupBookingID ||
        entry.id;

      discussion1Groups.add(groupKey);
    } else if (room === "Discussion Room 2") {
      const groupKey =
        entry.SourceRequestID ||
        entry.GroupBookingID ||
        entry.id;

      discussion2Groups.add(groupKey);
    } else if (room === "E-Resource") {
      if (entry.ID) {
        eResourceStudents.add(entry.ID);
      }
    }
  });

  return {
    discussion1: discussion1Groups.size,
    discussion2: discussion2Groups.size,
    eResource: eResourceStudents.size,
  };
};

const dailyUsage = getDailyUsage();

// Get end time of a pending request
const getPendingEndTime = (entry) => {
  const start = convertToDate(entry.bookingStart);

  if (!start) return null;

  const end = new Date(start);

  end.setMinutes(
    end.getMinutes() + (Number(entry.durationMinutes) || 0)
  );

  return end;
};

// Check whether this is the student's second E-Resource booking today
// Check whether this is the student's second E-Resource booking today
const isSecondEResourceBooking = (entry) => {
  if (entry?.room !== "E-Resource") return false;

  const studentId = String(entry.hostId || entry.ID || "").trim();

  if (!studentId) return false;

  const today = new Date().toDateString();
  const now = new Date();

  // Find completed E-Resource bookings for this student today
  const completedBookings = approved.filter((booking) => {
    if (booking.Room !== "E-Resource") return false;
    if (String(booking.ID).trim() !== studentId) return false;

    const startTime = convertToDate(booking.Timestamp);

    if (!startTime || startTime.toDateString() !== today) {
      return false;
    }

    const endTime = calculateEndTime(
      booking.Timestamp,
      booking.Duration,
      booking.EndTimestamp
    );

    return endTime && endTime <= now;
  });

  return completedBookings.length === 1;
};

// Notifications for teachers added through Add Patron
const teacherNotificationGroups = Object.values(
  approved
    .filter((entry) =>
      entry.GroupBookingID?.startsWith("manual-")
    )
    .reduce((groups, entry) => {
      const key = entry.GroupBookingID;

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(entry);
      return groups;
    }, {})
).filter((group) => {
  const firstEntry = group[0];

  const endTime = calculateEndTime(
    firstEntry.Timestamp,
    firstEntry.Duration,
    firstEntry.EndTimestamp
  );

  return currentTime < endTime;
});


  const now = new Date();

  console.log("Selected room:", selectedRoom);
  console.log("Selected date filter:", exportType);
  console.log("Current date:", new Date().toString());

  console.table(
    approved.slice(0, 10).map((entry) => ({
      ID: entry.ID,
      Room: entry.Room,
      Timestamp: entry.Timestamp,
      TimestampType: typeof entry.Timestamp,
      IsFirestoreTimestamp:
        typeof entry.Timestamp?.toDate === "function",
    }))
  );

  const startOfToday = new Date(now);
startOfToday.setHours(0, 0, 0, 0);


const filteredApproved = (() => {
  const filtered = approved.filter((entry) => {
    const ts = convertToDate(entry.Timestamp);

    if (!ts) return false;

    let matchesDate = true;

if (exportType === "day") {
  matchesDate = ts.toDateString() === now.toDateString();
}

else if (exportType === "yesterday") {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  matchesDate = ts.toDateString() === yesterday.toDateString();
}

else if (exportType === "month") {
  matchesDate =
    ts.getMonth() === now.getMonth() &&
    ts.getFullYear() === now.getFullYear();
}

else if (exportType === "custom") {
  if (customStartDate && customEndDate) {
    const start = new Date(`${customStartDate}T00:00:00`);
    const end = new Date(`${customEndDate}T23:59:59.999`);

    matchesDate = ts >= start && ts <= end;
  } else {
    matchesDate = false;
  }
}

else if (exportType === "all") {
  matchesDate = true;
}

    const normalizeRoom = (room) =>
      (room || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const selected = normalizeRoom(selectedRoom);
    const actual = normalizeRoom(entry.Room);

    const matchesRoom =
      selected === "all" ||
      selected === "allrooms" ||
      (selected === "discussionroom"
        ? [
            "discussionroom",
            "discussionroom1",
            "discussionroom2",
          ].includes(actual)
        : selected === "eresource" ||
          selected === "eresourceroom"
        ? ["eresource", "eresourceroom"].includes(actual)
        : actual === selected);

    return matchesDate && matchesRoom;
  });

 
const groups = {};

filtered.forEach((entry) => {
  const start = convertToDate(entry.Timestamp);
  if (!start) return;

  const dateKey = [
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  ].join("-");

  const key = [
    String(entry.ID).trim(),
    entry.Room,
    dateKey,
  ].join("_");

  // Calculate the actual end time of this particular booking
  const end = calculateEndTime(
    entry.Timestamp,
    entry.Duration,
    entry.EndTimestamp
  );

  const actualMinutes = getDurationMinutes(entry);

  const bookingDetail = {
  id: entry.id,
  PC: entry.PC || "-",
  start,
  end,
  minutes: actualMinutes,
  EarlyLogout: entry.EarlyLogout === true,
};

  if (!groups[key]) {
    groups[key] = {
      ...entry,
      allBookingIds: [entry.id],
      bookingDetails: [bookingDetail],
      totalMinutes: actualMinutes,
      bookingCount: 1,
    };
  } else {
    groups[key].allBookingIds.push(entry.id);
    groups[key].bookingDetails.push(bookingDetail);
    groups[key].totalMinutes += actualMinutes;
    groups[key].bookingCount += 1;
  }
});

return Object.values(groups)
  .map((group) => {
    // Show individual bookings in chronological order
    const bookingDetails = [...group.bookingDetails].sort(
      (a, b) => a.start - b.start
    );

    const firstBooking = bookingDetails[0];
    const lastBooking = bookingDetails[bookingDetails.length - 1];

    return {
      ...group,
      Timestamp: firstBooking.start.toISOString(),
      EndTimestamp: lastBooking.end
        ? lastBooking.end.toISOString()
        : "",
      PC: bookingDetails.map((booking) => booking.PC).join(", "),
      Duration: `${(group.totalMinutes / 60).toFixed(1)} hours`,
      bookingDetails,
    };
  })
  .sort((a, b) => {
    return (
      convertToDate(b.Timestamp) - convertToDate(a.Timestamp)
    );
  });


})();

          //const now = new Date();

     

  return (
    <div className="admin-page">

  {/* College Header */}
  <header className="college-header">
    <div className="college-logo">
      <img src="/ves-logo.png" alt="VES Logo" />
    </div>

    <div className="college-title">
      <h2>Vivekanand Education Society's</h2>
      <h3>College of Arts, Science & Commerce (Autonomous)</h3>
      <h4>Learning Resource Centre</h4>
    </div>
  </header>

  <div className="admin-body">
      <div className="sidebar">
        <h2>Admin</h2>
        <p>👤 {userEmail}</p>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>

       <div className="notifications">
  <h4>Notifications</h4>

  <div className="notification-list">

    {/* PENDING BOOKING REQUESTS */}
    {pending.map((e) => {
      const startTime = convertToDate(e.bookingStart);
      const endTime = getPendingEndTime(e);

      const ids =
        Array.isArray(e.allIds) && e.allIds.length
          ? e.allIds.join(", ")
          : e.hostId || e.ID || "N/A";

      return (
        <div className="notification-item" key={e.id}>
          <h5>🟡 New Booking Request</h5>

          {isSecondEResourceBooking(e) && (
  <p className="second-booking-message">
    ⚠️ This is the student's second booking today.
    First booking has been completed.
  </p>
)}

          <p><strong>Student ID:</strong> {ids}</p>
          <p><strong>Room:</strong> {e.room || "N/A"}</p>
          <p><strong>PC:</strong> {e.pc || "-"}</p>
          <p><strong>Purpose:</strong> {e.purpose || "N/A"}</p>
          <p>
            <strong>Date:</strong>{" "}
            {startTime
              ? startTime.toLocaleDateString("en-IN")
              : "N/A"}
          </p>
          <p>
            <strong>In Time:</strong>{" "}
            {startTime
              ? startTime.toLocaleTimeString("en-IN")
              : "N/A"}
          </p>
          <p>
            <strong>Out Time:</strong>{" "}
            {endTime
              ? endTime.toLocaleTimeString("en-IN")
              : "N/A"}
          </p>
        </div>
      );
    })}

    {/* TEACHERS ADDED THROUGH ADD PATRON */}
    {teacherNotificationGroups.map((group) => {
      const firstEntry = group[0];

      const startTime = convertToDate(firstEntry.Timestamp);
      const endTime = calculateEndTime(
        firstEntry.Timestamp,
        firstEntry.Duration,
        firstEntry.EndTimestamp
      );

      const addedTime = convertToDate(
        firstEntry.CreatedAt
      );

      return (
        <div
          className="notification-item teacher-notification"
          key={firstEntry.GroupBookingID}
        >
          <h5>🟢 Teacher / Patron Added</h5>

          <p>
            <strong>Name/ID:</strong>{" "}
            {group.map((entry) => entry.ID).join(", ")}
          </p>

          <p><strong>Room:</strong> {firstEntry.Room}</p>

          <p><strong>Purpose:</strong> {firstEntry.Purpose}</p>

          <p>
            <strong>Date:</strong>{" "}
            {startTime
              ? startTime.toLocaleDateString("en-IN")
              : "N/A"}
          </p>

          <p>
            <strong>In Time:</strong>{" "}
            {startTime
              ? startTime.toLocaleTimeString("en-IN")
              : "N/A"}
          </p>

          <p>
            <strong>Out Time:</strong>{" "}
            {endTime.toLocaleTimeString("en-IN")}
          </p>

          <p>
            <strong>Added At:</strong>{" "}
            {addedTime
              ? addedTime.toLocaleString("en-IN")
              : "Previously Added"}
          </p>
        </div>
      );
    })}

    {pending.length === 0 &&
      teacherNotificationGroups.length === 0 && (
        <p className="no-notifications">
          No new notifications.
        </p>
      )}

  </div>
</div>
      </div>

      <div className="main-content">
        {pending.length ? (
          <div className="admin-controls">
            <p>{pending[0].room} requested. Approve?</p>

            {isSecondEResourceBooking(pending[0]) && (
  <p className="second-booking-message">
    ⚠️ This is the student's second E-Resource booking today.
  </p>
)}

            <p>
              <strong>Host ID:</strong>{" "}
              {pending[0].hostId ||
                pending[0].ID ||
                pending[0].allIds?.[0] ||
                "N/A"}
            </p>

            {Array.isArray(pending[0].allIds) &&
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

         <div className="live-occupancy">
  <h2>Live Room Occupancy</h2>
  

  <div className="occupancy-cards">


{(selectedRoom === "All" ||
  selectedRoom === "Discussion Room") && (
    <div className="occupancy-card">
      <h3>Discussion Room 1</h3>
      <h2>{liveOccupancy.discussion1.members} / 6</h2>
      <p>Active Members</p>

      <div className="occupancy-divider"></div>

      <h3 className="group-count">
        {liveOccupancy.discussion1.groups}
      </h3>
      <p>Active Groups</p>
      <div className="occupancy-divider"></div>

<h3 className="group-count">
  {dailyUsage.discussion1}
</h3>
<p>Groups Used Today</p>
    </div>
  )}
  {(selectedRoom === "All" ||
  selectedRoom === "Discussion Room") && (
    <div className="occupancy-card">
      <h3>Discussion Room 2</h3>
      <h2>{liveOccupancy.discussion2.members} / 6</h2>
      <p>Active Members</p>

      <div className="occupancy-divider"></div>

      <h3 className="group-count">
        {liveOccupancy.discussion2.groups}
      </h3>
      <p>Active Groups</p>
      <div className="occupancy-divider"></div>

<h3 className="group-count">
  {dailyUsage.discussion2}
</h3>
<p>Groups Used Today</p>
    </div>
  )}
  {(selectedRoom === "All" ||
  selectedRoom === "E-Resource Room") && (
    <div className="occupancy-card">
      <h3>E-Resource</h3>
      <h2>{liveOccupancy.eResource.members} / 6</h2>
      <p>Occupied PCs</p>
      <div className="occupancy-divider"></div>

<h3 className="group-count">
  {dailyUsage.eResource}
</h3>
<p>Students Used Today</p>
    </div>
  )}
  </div>
 
</div>

        <div className="admin-actions">
          <button onClick={() => setShowAddForm(true)}>
            Add Patron
          </button>

          {/* <button onClick={() => setShowSpecialForm(true)}>
            Special Booking
          </button> */}

          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
          >
            <option value="All">All Rooms</option>
            <option value="Discussion Room">Discussion Room</option>
            <option value="E-Resource Room">E-Resource Room</option>
            <option value="Periodical Room">Periodical Room</option>
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
  placeholder={`Enter Name or ID ${idx + 1}`}
  value={id}
  onChange={(e) => {
    const updated = [...idInputs];
    updated[idx] = e.target.value;
    setIdInputs(updated);
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

            <label>Booking Date</label>
            <input
              type="date"
              value={newBookingDate}
              min={new Date().toLocaleDateString("en-CA")}
              onChange={(e) => setNewBookingDate(e.target.value)}
              required
            />

           <label>In Time</label>
<input
  type="time"
  value={newBookingTime}
  onChange={(e) => setNewBookingTime(e.target.value)}
  required
/>

<label>Out Time</label>
<input
  type="time"
  value={newEndTime}
  onChange={(e) => setNewEndTime(e.target.value)}
  required
/>

            <label>Room</label>
            <select
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              required
            >
              <option value="Discussion Room 1">Discussion Room 1</option>
              <option value="Discussion Room 2">Discussion Room 2</option>
              <option value="E-Resource">E-Resource</option>
              <option value="Periodical Room">Periodical Room</option>
            </select>

            <button className="small-btn" onClick={handleAddPatron}>
              Save
            </button>

            <button
              className="small-btn"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        )}
       {/*  {showSpecialForm && (
  <div className="admin-form special-booking-form">
    <h3>Special Booking</h3>

  <label>
  {specialRoom === "E-Resource" ? "Student ID" : "Host Student ID"}
</label>
    <input
      type="text"
      value={specialStudentId}
      maxLength={7}
      placeholder="Enter 7-digit Student ID"
      onChange={(e) =>
        setSpecialStudentId(e.target.value.replace(/\D/g, ""))
      }
    />

    {specialRoom !== "E-Resource" && (
  <>
    <label>Member Student ID(s)</label>

    {specialMemberIds.map((memberId, index) => (
      <div key={index} className="member-id-row">
        <input
          type="text"
          value={memberId}
          maxLength={7}
          placeholder={`Enter Member ${index + 1} Student ID`}
          onChange={(e) => {
            const updatedIds = [...specialMemberIds];
            updatedIds[index] = e.target.value.replace(/\D/g, "");
            setSpecialMemberIds(updatedIds);
          }}
        />

        {specialMemberIds.length > 1 && (
          <button
            type="button"
            onClick={() =>
              setSpecialMemberIds(
                specialMemberIds.filter((_, i) => i !== index)
              )
            }
          >
            Remove
          </button>
        )}
      </div>
    ))}

    <button
      type="button"
      onClick={() => setSpecialMemberIds([...specialMemberIds, ""])}
    >
      + Add Member
    </button>
  </>
)}

    <label>Room</label>
    <select
      value={specialRoom}
      onChange={(e) => {
  setSpecialRoom(e.target.value);
  setSpecialPC("");
  setSpecialMemberIds([""]);
      }}
    >
      <option value="Discussion Room 1">Discussion Room 1</option>
      <option value="Discussion Room 2">Discussion Room 2</option>
      <option value="E-Resource">E-Resource</option>
    </select>

    {specialRoom === "E-Resource" && (
  <>
    <label>Select PC</label>

    <select
      value={specialPC}
      onChange={(e) => setSpecialPC(e.target.value)}
    >
      <option value="">Select PC</option>

      {["PC1", "PC2", "PC3", "PC4", "PC5", "PC6"].map((pc) => {
        const booked = isSpecialPCBooked(pc);

        return (
          <option key={pc} value={pc} disabled={booked}>
            {pc} {booked ? "(Occupied)" : "(Available)"}
          </option>
        );
      })}
    </select>
  </>
)}

    <label>Purpose</label>
    <input
      type="text"
      value={specialPurpose}
      placeholder="Enter purpose"
      onChange={(e) => setSpecialPurpose(e.target.value)}
    />

    <label>Duration</label>
    <select
      value={specialDuration}
      onChange={(e) => setSpecialDuration(e.target.value)}
    >
      <option value="0.5 hours">0.5 hours</option>
      <option value="1 hour">1 hour</option>
    </select>

    <p>
      Date and In Time will be set automatically.
      Out Time will be calculated from the selected duration.
    </p>

    <button onClick={handleSpecialBooking}>
      Add Special Booking
    </button>

    <button onClick={() => setShowSpecialForm(false)}>
      Cancel
    </button>
  </div> 
)}*/}

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

                const endTime = e.bookingDetails?.length
  ? e.bookingDetails[e.bookingDetails.length - 1].end
  : calculateEndTime(
      isEditing ? editData.Timestamp : e.Timestamp,
      isEditing ? editData.Duration : e.Duration,
      isEditing ? editData.EndTimestamp : e.EndTimestamp
    );

const isExpired = endTime ? currentTime > endTime : false;
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
                    <td>
  {e.bookingDetails?.map((booking, index) => (
    <div key={booking.id || index}>
      {booking.PC}
    </div>
  ))}
</td>

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

                    <td>
  {convertToDate(e.Timestamp)
    ? convertToDate(e.Timestamp).toLocaleDateString("en-IN")
    : "-"}
</td>

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
    e.bookingDetails?.map((booking, index) => (
      <div key={booking.id || index}>
        {booking.start
          ? booking.start.toLocaleTimeString("en-IN")
          : "-"}
      </div>
    ))
  )}
</td>

                   <td>
  {isEditing ? (
    <input
      type="datetime-local"
      value={editData.EndTimestamp || ""}
      onChange={(ev) =>
        handleEditChange("EndTimestamp", ev.target.value)
      }
    />
  ) : (
    e.bookingDetails?.map((booking, index) => (
      <div
        key={booking.id || index}
        style={{
          color:
            booking.end && currentTime > booking.end
              ? "red"
              : "inherit",
          fontWeight:
            booking.end && currentTime > booking.end
              ? "bold"
              : "normal",
        }}
      >
        {booking.end
          ? booking.end.toLocaleTimeString("en-IN")
          : "-"}
      </div>
    ))
  )}
</td>

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
                            onClick={() => {
                              setEditRowId(null);
                              setEditData({});
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
  <>
  {e.Room === "E-Resource" && (() => {
  const activeBooking = (e.bookingDetails || [])
    .filter(
      (booking) =>
        booking.start &&
        booking.end &&
        currentTime >= booking.start &&
        currentTime < booking.end
    )
    .sort((a, b) => b.start - a.start)[0];

  const isBookingActive =
    activeBooking && activeBooking.EarlyLogout !== true;

  return (
    <button
      className="early-logout-btn"
      disabled={!isBookingActive}
      onClick={() => handleEarlyLogout(e, activeBooking)}
    >
      {!activeBooking
        ? "Early Logout"
        : activeBooking.EarlyLogout
        ? "Logged Out"
        : "Early Logout"}
    </button>
  );
})()}
  

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
    </div>
  );
};

export default AdminPanel;