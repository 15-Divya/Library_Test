// home.js (Firebase integration)
import React, { useState, useEffect } from "react";
import "./home.css";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  onSnapshot
} from "firebase/firestore";

const Home = () => {
  const [room, setRoom] = useState("Discussion Room 1");
  const [scannedBy, setScannedBy] = useState("Discussion");
  const [otherPurpose, setOtherPurpose] = useState("");
  const [hostId, setHostId] = useState("");
  const [groupMembers, setGroupMembers] = useState(["", ""]);
  const [timeDuration, setTimeDuration] = useState("1 hour");
  const [pc, setPc] = useState("");
  const [bookedPCs, setBookedPCs] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [roomAvailability, setRoomAvailability] = useState({
  "Discussion Room 1": true,
  "Discussion Room 2": true,
  "E-Resource": true,
});

const calculateEndTime = (timestamp, duration, savedEndTime) => {
  // Use the Out Time saved by the admin, if available
  if (savedEndTime) {
    const endTime =
      typeof savedEndTime.toDate === "function"
        ? savedEndTime.toDate()
        : new Date(savedEndTime);

    if (!Number.isNaN(endTime.getTime())) {
      return endTime;
    }
  }

  // Otherwise, calculate Out Time using the booking duration
  const startTime =
    typeof timestamp?.toDate === "function"
      ? timestamp.toDate()
      : new Date(timestamp);

  let durationMinutes = 0;

  if (duration === "0.5 hours") {
    durationMinutes = 30;
  } else if (duration === "1 hour") {
    durationMinutes = 60;
  } else if (duration === "1.5 hours") {
    durationMinutes = 90;
  }

  return new Date(
    startTime.getTime() + durationMinutes * 60 * 1000
  );
};
  

 const checkBookedPCs = async () => {
  try {
    const currentlyBooked = [];
    const now = new Date();

    // =========================
    // CHECK PENDING REQUESTS
    // =========================

    const requestSnapshot = await getDocs(
      collection(db, "requests")
    );

    requestSnapshot.forEach((doc) => {
      const data = doc.data();

      console.log("REQUEST DATA:", data);

      if (
        data.room === "E-Resource" &&
        data.pc &&
        data.bookingStart &&
        data.durationMinutes
      ) {
        

const startTime = data.bookingStart.toDate();

const endTime = new Date(
  startTime.getTime() + data.durationMinutes * 60 * 1000
);



        if (now >= startTime && now < endTime) {
          currentlyBooked.push(data.pc);
        }
      }
    });


    // =========================
    // CHECK APPROVED BOOKINGS
    // =========================

    const approvedSnapshot = await getDocs(
      collection(db, "approved")
    );

    approvedSnapshot.forEach((doc) => {
      const data = doc.data();

      console.log("APPROVED DATA:", data);

      if (
        data.Room === "E-Resource" &&
        data.PC &&
        data.Timestamp &&
        data.Duration
      ) {
        const startTime =
  typeof data.Timestamp.toDate === "function"
    ? data.Timestamp.toDate()
    : new Date(data.Timestamp);

const endTime = calculateEndTime(
  data.Timestamp,
  data.Duration,
  data.EndTimestamp
);

        

        if (now >= startTime && now < endTime) {
          currentlyBooked.push(data.PC);
        }
      }
    });


    // =========================
    // REMOVE DUPLICATES
    // =========================

    const uniqueBookedPCs = [
      ...new Set(currentlyBooked)
    ];

    setBookedPCs(uniqueBookedPCs);

    console.log(
      "Currently booked PCs:",
      uniqueBookedPCs
    );

  } catch (error) {
    console.log(
      "Error checking PC availability:",
      error
    );
  }
};

const checkStudentUsedDiscussion = async (studentId) => {
  try {
    const today = new Date();

    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0, 0, 0, 0
    );

    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23, 59, 59, 999
    );

    // Check pending requests
    const requestSnapshot = await getDocs(collection(db, "requests"));

    for (const doc of requestSnapshot.docs) {
      const data = doc.data();

      if (
        ["Discussion Room", "Discussion Room 1", "Discussion Room 2"].includes(data.room) &&
        Array.isArray(data.allIds) &&
        data.bookingStart
      ) {
        const bookingDate = data.bookingStart.toDate();

        if (
          bookingDate >= startOfDay &&
          bookingDate <= endOfDay &&
          data.allIds.includes(studentId)
        ) {
          return true;
        }
      }
    }

    // Check approved bookings
    const approvedSnapshot = await getDocs(collection(db, "approved"));

    for (const doc of approvedSnapshot.docs) {
      const data = doc.data();

      if (
        ["Discussion Room", "Discussion Room 1", "Discussion Room 2"].includes(data.Room) &&
        data.ID === studentId &&
        data.Timestamp
      ) {
        const bookingDate = new Date(data.Timestamp);

        if (
          bookingDate >= startOfDay &&
          bookingDate <= endOfDay
        ) {
          return true;
        }
      }
    }

    return false;

  } catch (error) {
    console.log("Error checking Discussion Room usage:", error);
    return false;
  }
};


const checkStudentUsedEResource = async (studentId) => {
  try {
    const today = new Date();

    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0, 0, 0, 0
    );

    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23, 59, 59, 999
    );

    // Check pending requests
    const requestSnapshot = await getDocs(
      collection(db, "requests")
    );

    for (const doc of requestSnapshot.docs) {
      const data = doc.data();

      if (
        data.room === "E-Resource" &&
        data.hostId === studentId &&
        data.bookingStart
      ) {
        const bookingDate = data.bookingStart.toDate();

        if (
          bookingDate >= startOfDay &&
          bookingDate <= endOfDay
        ) {
          return true;
        }
      }
    }

    // Check approved bookings
    const approvedSnapshot = await getDocs(
      collection(db, "approved")
    );

    for (const doc of approvedSnapshot.docs) {
      const data = doc.data();

      if (
        data.Room === "E-Resource" &&
        data.ID === studentId &&
        data.Timestamp
      ) {
        const bookingDate = new Date(data.Timestamp);

        if (
          bookingDate >= startOfDay &&
          bookingDate <= endOfDay
        ) {
          return true;
        }
      }
    }

    return false;

  } catch (error) {
    console.log(
      "Error checking E-Resource usage:",
      error
    );

    return false;
  }
};


const checkRoomAvailability = async () => {
  try {
    const now = new Date();

    let discussionRoom1Count = 0;
    let discussionRoom2Count = 0;
    let eResourceCount = 0;

    // =========================
    // CHECK PENDING REQUESTS
    // =========================

    const requestSnapshot = await getDocs(
      collection(db, "requests")
    );

    requestSnapshot.forEach((doc) => {
      const data = doc.data();

      if (!data.bookingStart || !data.durationMinutes) {
        return;
      }

     const startTime = data.bookingStart.toDate();

const endTime = new Date(
  startTime.getTime() +
    data.durationMinutes * 60 * 1000
);

      // Only count currently active bookings
      if (now >= startTime && now < endTime) {

        // Discussion Room
        if (
  ["Discussion Room", "Discussion Room 1"].includes(data.room) &&
  Array.isArray(data.allIds)
) {
  discussionRoom1Count += data.allIds.length;
}

if (
  data.room === "Discussion Room 2" &&
  Array.isArray(data.allIds)
) {
  discussionRoom2Count += data.allIds.length;
}

        // E-Resource
        if (data.room === "E-Resource") {
          if (data.pc) {
            eResourceCount++;
          }
        }
      }
    });


    // =========================
    // CHECK APPROVED BOOKINGS
    // =========================

    const approvedSnapshot = await getDocs(
      collection(db, "approved")
    );

    approvedSnapshot.forEach((doc) => {
      const data = doc.data();

      if (
        !data.Timestamp ||
        !data.Duration
      ) {
        return;
      }

      const startTime =
  typeof data.Timestamp?.toDate === "function"
    ? data.Timestamp.toDate()
    : new Date(data.Timestamp);

const endTime = calculateEndTime(
  data.Timestamp,
  data.Duration,
  data.EndTimestamp
);

      // Only count currently active bookings
      if (now >= startTime && now < endTime) {

        // Discussion Room
        if (["Discussion Room", "Discussion Room 1"].includes(data.Room)) {
  discussionRoom1Count++;
}

if (data.Room === "Discussion Room 2") {
  discussionRoom2Count++;
}

        // E-Resource
        if (
          data.Room === "E-Resource" &&
          data.PC
        ) {
          eResourceCount++;
        }
      }
    });


    // =========================
    // CHECK CAPACITY
    // =========================

   setRoomAvailability({
  "Discussion Room 1": discussionRoom1Count < 6,
  "Discussion Room 2": discussionRoom2Count < 6,
  "E-Resource": eResourceCount < 6,
});

console.log("Discussion Room 1 students:", discussionRoom1Count);
console.log("Discussion Room 2 students:", discussionRoom2Count);
console.log("E-Resource PCs:", eResourceCount);

  } catch (error) {
    console.log(
      "Error checking room availability:",
      error
    );
  }
};



const checkDiscussionRoomCapacity = async (selectedRoom, newMemberCount) => {
  try {
    const now = new Date();
    let bookedMembers = 0;

    // Count members in pending requests
    const requestSnapshot = await getDocs(
      collection(db, "requests")
    );

    requestSnapshot.forEach((doc) => {
      const data = doc.data();

      const matchesRoom =
        selectedRoom === "Discussion Room 1"
          ? ["Discussion Room", "Discussion Room 1"].includes(data.room)
          : data.room === selectedRoom;

      if (
        matchesRoom &&
        data.bookingStart &&
        data.durationMinutes &&
        Array.isArray(data.allIds)
      ) {
        const startTime = data.bookingStart.toDate();
        const endTime = new Date(
          startTime.getTime() + data.durationMinutes * 60 * 1000
        );

        if (now >= startTime && now < endTime) {
          bookedMembers += data.allIds.length;
        }
      }
    });

    // Count members in approved bookings
    const approvedSnapshot = await getDocs(
      collection(db, "approved")
    );

    approvedSnapshot.forEach((doc) => {
      const data = doc.data();

      const matchesRoom =
        selectedRoom === "Discussion Room 1"
          ? ["Discussion Room", "Discussion Room 1"].includes(data.Room)
          : data.Room === selectedRoom;

      if (
        matchesRoom &&
        data.Timestamp &&
        data.Duration
      ) {
        const startTime =
          typeof data.Timestamp.toDate === "function"
            ? data.Timestamp.toDate()
            : new Date(data.Timestamp);

        const endTime = calculateEndTime(
          data.Timestamp,
          data.Duration,
          data.EndTimestamp
        );

        if (now >= startTime && now < endTime) {
          bookedMembers++;
        }
      }
    });

    const remainingCapacity = Math.max(0, 6 - bookedMembers);

    if (newMemberCount > remainingCapacity) {
      alert(
        `Only ${remainingCapacity} more member(s) allowed in ${selectedRoom}. ` +
        `Available capacity: ${remainingCapacity}.`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking discussion room capacity:", error);
    alert("Unable to check room capacity. Please try again.");
    return false;
  }
};



  const handleGroupMemberChange = (index, value) => {
    const updated = [...groupMembers];
    updated[index] = value;
    setGroupMembers(updated);
  };

  const handleAddMember = () => {
    if (groupMembers.length >= 5) {
      alert("You can add up to 5 group members only.");
      return;
    }
    setGroupMembers([...groupMembers, ""]);
  };

  useEffect(() => {
  const unsubscribeRequests = onSnapshot(
    collection(db, "requests"),
    () => {
      checkBookedPCs();
      checkRoomAvailability();
    }
  );

  const unsubscribeApproved = onSnapshot(
    collection(db, "approved"),
    () => {
      checkBookedPCs();
      checkRoomAvailability();
    }
  );

  // Refresh when time passes, even if Firestore does not change
  const interval = setInterval(() => {
    checkBookedPCs();
    checkRoomAvailability();
  }, 30000);

  return () => {
    unsubscribeRequests();
    unsubscribeApproved();
    clearInterval(interval);
  };
}, []);

  const handleSubmit = async () => {
    if (!roomAvailability[room]) {
  alert(`${room} is currently full.`);
  return;
}
    const trimmedHostId = hostId.trim();
    

     if (!/^\d{7}$/.test(trimmedHostId)) {
    alert("Host ID must contain exactly 7 numbers.");
    return;
  }


    const purposeToUse = scannedBy === "Others" ? otherPurpose.trim() : scannedBy;
    if (!purposeToUse) {
      alert("Please specify the purpose.");
      return;
    }

    if (room === "E-Resource" && !pc) {
    alert("Please select a PC.");
    return;
    }
    if (room === "E-Resource" && bookedPCs.includes(pc)) {
  alert("This PC is already booked. Please select another PC.");
  return;
    
}

    if (room === "E-Resource") {
       const alreadyUsed = await checkStudentUsedEResource(
    trimmedHostId
  );

    if (alreadyUsed) {
    alert(
      "You have already booked E-Resource today. You can access E-Resource only once per day."
    );
    return;
  }
}


     // =========================
  // GROUP MEMBER IDs
  // =========================

  const trimmedGroup =
 ["Discussion Room 1", "Discussion Room 2"].includes(room)
    ? groupMembers.map((id) => id.trim()).filter(Boolean)
    : [];

// GROUP MEMBER VALIDATION
if (
  ["Discussion Room 1", "Discussion Room 2"].includes(room) &&
  trimmedGroup.some((id) => !/^\d{7}$/.test(id))
) {
  alert("All group member IDs must contain exactly 7 numbers.");
  return;
}

// HOST AND MEMBER SAME CHECK
if (["Discussion Room 1", "Discussion Room 2"].includes(room)) {

  const sameAsHost = trimmedGroup.some(
    (memberId) => memberId === trimmedHostId
  );

  if (sameAsHost) {
    alert("Host ID and Group Member ID cannot be the same.");
    return;
  }
}

// DUPLICATE MEMBER CHECK
if (["Discussion Room 1", "Discussion Room 2"].includes(room)) {

  const uniqueMembers = new Set(trimmedGroup);

  if (uniqueMembers.size !== trimmedGroup.length) {
    alert("Group Member IDs cannot be repeated.");
    return;
  }
}

// DAILY DISCUSSION ROOM CHECK
  if (["Discussion Room 1", "Discussion Room 2"].includes(room)) {

  const allStudentIds = [
    trimmedHostId,
    ...trimmedGroup
  ];

  for (const studentId of allStudentIds) {

    const alreadyUsed =
      await checkStudentUsedDiscussion(studentId);

    if (alreadyUsed) {
      alert(
        `${studentId} has already booked/participated in a Discussion Room today. Each student can use the Discussion Room only once per day.`
      );
      return;
    }
  }
}

      

    

    
const allIds = [trimmedHostId, ...trimmedGroup];

// Check that the complete group fits in the room
if (
  ["Discussion Room 1", "Discussion Room 2"].includes(room)
) {
  const hasCapacity = await checkDiscussionRoomCapacity(
    room,
    allIds.length
  );

  if (!hasCapacity) {
    return;
  }
}

const now = new Date();

    const formattedTime = now.toLocaleString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour12: true,
    });

    try {
      let durationMinutes = 0;

if (timeDuration === "0.5 hours") {
  durationMinutes = 30;
} else if (timeDuration === "1 hour") {
  durationMinutes = 60;
} else if (timeDuration === "1.5 hours") {
  durationMinutes = 90;
}

await addDoc(collection(db, "requests"), {
  hostId: trimmedHostId,
  groupMembers: trimmedGroup,
  room,
  pc: room === "E-Resource" ? pc : "",
  purpose: purposeToUse,
  duration: timeDuration,
  durationMinutes: durationMinutes,
  bookingStart: Timestamp.now(),
  time: formattedTime,
  allIds,
});
      setIsSubmitted(true);
      setHostId("");
      setGroupMembers(["", ""]);
      setTimeDuration("1.5 hours");
      setPc("");
      if (scannedBy === "Others") setOtherPurpose("");
    } catch (error) {
  console.error("Booking submission failed:", error);
  alert(`Failed to submit: ${error.code || error.message}`);
}
  };

  return (
    <div className="card-container">
      <div className="left-panel">
        <div className="overlay"></div>
        <h1>📓 VESASC Library</h1>
        <p>Book smarter. Collaborate better. Track your discussion room with ease.</p>
      </div>

      <div className="right-panel">
        <h2>Library Room Booking</h2>

        {!isSubmitted ? (
          <>
           <div className="form-group">
  <label>Room:</label>

  <select
    value={room}
    onChange={(e) => setRoom(e.target.value)}
  >
    <option
      value="Discussion Room 1"
      disabled={!roomAvailability["Discussion Room 1"]}
    >
      Discussion Room 1
      {!roomAvailability["Discussion Room 1"] ? " (Full)" : ""}
    </option>

    <option
      value="Discussion Room 2"
      disabled={!roomAvailability["Discussion Room 2"]}
    >
      Discussion Room 2
      {!roomAvailability["Discussion Room 2"] ? " (Full)" : ""}
    </option>

    <option
      value="E-Resource"
      disabled={!roomAvailability["E-Resource"]}
    >
      E-Resource
      {!roomAvailability["E-Resource"] ? " (Full)" : ""}
    </option>
  </select>
</div>

           
  {room === "E-Resource" && (
  <div className="form-group">
    <label>Select PC:</label>

    <select
      value={pc}
      onChange={(e) => setPc(e.target.value)}
    >
      <option value="">Select PC</option>

      <option value="PC1" disabled={bookedPCs.includes("PC1")}>
        PC1 {bookedPCs.includes("PC1") ? "(Booked)" : ""}
      </option>

      <option value="PC2" disabled={bookedPCs.includes("PC2")}>
        PC2 {bookedPCs.includes("PC2") ? "(Booked)" : ""}
      </option>

      <option value="PC3" disabled={bookedPCs.includes("PC3")}>
        PC3 {bookedPCs.includes("PC3") ? "(Booked)" : ""}
      </option>

      <option value="PC4" disabled={bookedPCs.includes("PC4")}>
        PC4 {bookedPCs.includes("PC4") ? "(Booked)" : ""}
      </option>

      <option value="PC5" disabled={bookedPCs.includes("PC5")}>
        PC5 {bookedPCs.includes("PC5") ? "(Booked)" : ""}
      </option>

      <option value="PC6" disabled={bookedPCs.includes("PC6")}>
        PC6 {bookedPCs.includes("PC6") ? "(Booked)" : ""}
      </option>
    </select>
  </div>
)}

            <div className="form-group">
              <label>Purpose:</label>
              <select
                value={scannedBy}
                onChange={(e) => {
                  setScannedBy(e.target.value);
                  if (e.target.value !== "Others") setOtherPurpose("");
                }}
              >
                <option value="Discussion">Discussion</option>
                <option value="Study">Study</option>
                <option value="Others">Others</option>
              </select>
            </div>

            {scannedBy === "Others" && (
              <div className="form-group">
                <label>Please specify:</label>
                <input
                  type="text"
                  value={otherPurpose}
                  onChange={(e) => setOtherPurpose(e.target.value)}
                  placeholder="Specify other purpose"
                />
              </div>
            )}

            <div className="form-group">
              <label>Host Student ID</label>
             <input
              type="text"
              placeholder="Enter Host ID"
              value={hostId}
              onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setHostId(value);
  }}
               maxLength={7}
/>
            </div>

            {["Discussion Room 1", "Discussion Room 2"].includes(room) && (
              <div className="form-group">
                <label>Group Member IDs</label>
                {groupMembers.map((member, index) => (
                 <input
                key={index}
                type="text"
                placeholder={`Member ${index + 1}`}
                value={member}
                onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                handleGroupMemberChange(index, value);
  }}
  maxLength={7}
/>
                ))}
                <div
                  className="add-member"
                  onClick={handleAddMember}
                  style={{
                    color: groupMembers.length >= 5 ? "gray" : {},
                    cursor: groupMembers.length >= 5 ? "not-allowed" : "pointer",
                  }}
                >
                  + Add Member
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Time Duration:</label>
              <select
                value={timeDuration}
                onChange={(e) => setTimeDuration(e.target.value)}
              >

                <option value="0.5 hours">Half hour</option>
                <option value="1 hour">1 hour</option>
              </select>
            </div>

            <button onClick={handleSubmit}>Book now</button>
          </>
        ) : (
          <div className="submission-confirmation">Response recorded. Thank you!</div>
        )}
      </div>
    </div>
  );
};

export default Home;