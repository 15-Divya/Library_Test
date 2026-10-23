import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import Home from "./home";
import AdminPanel from "./Admin";
import Login from "./login";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

const AppLayout = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut(getAuth());
    setUser(null);
    navigate("/login");
  };

  return (
    <>
      {user && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: 16,
            backgroundColor: "#f5f5f5",
          }}
        ></div>
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={user ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/home"
          element={user ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={user ? <AdminPanel /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <Router>
      <AppLayout user={user} setUser={setUser} />
    </Router>
  );
};

export default App;
