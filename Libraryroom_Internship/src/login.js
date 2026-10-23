// login.js (Firebase Auth Version)
import React, { useState } from "react";
import "./login.css";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    //const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("✅ Login successful!");
      setTimeout(() => {
        navigate("/admin");
      }, 1500);
    } catch (err) {
      setMessage("❌ Invalid email or password.");
      console.error("Firebase login error:", err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form-section">
        <form className="form-wrapper">
          <h2 className="login-heading">Sign In</h2>

          <div className="input-block">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-block password-wrapper">
            <label>Enter Password</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              className="password-visibility-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              👁️
            </span>
          </div>

          <button type="button" className="login-btn" onClick={handleLogin}>
            Login
          </button>

          <div className="login-message">{message}</div>
        </form>
      </div>

      <div className="visual-section">
        <div className="visual-overlay"></div>
        <h1>📖 Study Smarter</h1>
        <p>Your personalized library experience awaits.</p>
      </div>
    </div>
  );
};

export default Login;
