import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/auth.css";
import API_URL from "../api";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (
      !formData.fullname.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fullname: formData.fullname.trim(),
            email: formData.email.trim(),
            password: formData.password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      setMessage("Account created successfully! Redirecting to login...");

      setFormData({
        fullname: "",
        email: "",
        password: "",
        confirmPassword: ""
      });

      setTimeout(() => navigate("/login"), 1500);

    } catch (error) {
      console.error("Registration error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async (credentialResponse) => {
    setError("");
    setMessage("");

    if (!credentialResponse.credential) {
      setError("Google sign-up failed. Please try again.");
      return;
    }

    setGoogleLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/google/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            credential: credentialResponse.credential
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Google registration failed.");
        return;
      }

      setMessage("Account created successfully! Please log in.");

      setTimeout(() => navigate("/login"), 1500);

    } catch (error) {
      console.error("Google registration error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          Study<span>Hub</span>
        </div>

        <h1>Create your account</h1>

        <p className="auth-subtitle">
          Join StudyHub and share knowledge with other students.
        </p>

        {error && (
          <div className="auth-error">
            {error}
            {error.toLowerCase().includes("already exists") && (
              <>
                {" "}
                <Link to="/login">Log in here.</Link>
              </>
            )}
          </div>
        )}

        {message && (
          <div className="auth-success">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="fullname"
              placeholder="Enter your full name"
              value={formData.fullname}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
  type={showPassword ? "text" : "password"}
  name="password"
  placeholder="Create a password"
  value={formData.password}
  onChange={handleChange}
/>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
           <input
  type={showConfirmPassword ? "text" : "password"}
  name="confirmPassword"
  placeholder="Confirm your password"
  value={formData.confirmPassword}
  onChange={handleChange}
/>

<div style={{ marginBottom: "16px" }}>
  <button
    type="button"
    onClick={() => {
      const newState = !(showPassword && showConfirmPassword);
      setShowPassword(newState);
      setShowConfirmPassword(newState);
    }}
    style={{
      background: "transparent",
      border: "none",
      padding: 0,
      cursor: "pointer",
      fontSize: "14px"
    }}
  >
    {showPassword && showConfirmPassword
      ? "Hide Password"
      : "Show Password"}
  </button>
</div>

          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || googleLoading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "20px 0"
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--border-color, #ddd)"
            }}
          />
          <span
            style={{
              fontSize: "13px",
              color: "var(--text-secondary, #777)"
            }}
          >
            OR SIGN UP WITH
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--border-color, #ddd)"
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%"
          }}
        >
          <GoogleLogin
            onSuccess={handleGoogleRegister}
            onError={() =>
              setError("Google sign-up failed. Please try again.")
            }
            text="signup_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width="300"
          />
        </div>

        {googleLoading && (
          <p style={{ textAlign: "center", fontSize: "13px" }}>
            Creating your account...
          </p>
        )}

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">Log in</Link>
        </p>

        <Link to="/" className="back-link">
          ← Back to StudyHub
        </Link>

      </div>
    </div>
  );
}

export default Register;