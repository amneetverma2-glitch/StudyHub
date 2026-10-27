import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/auth.css";

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleChange = (event) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        });
    };

    const saveLoginData = (data) => {
        localStorage.setItem("studyhub_token", data.token);
        localStorage.setItem("studyhub_user", JSON.stringify(data.user));
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/dashboard");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!formData.email || !formData.password) {
            setError("Please enter your email and password.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Invalid email or password.");
                return;
            }

            saveLoginData(data);
        } catch (error) {
            console.error("Login error:", error);
            setError("Unable to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setError("");

        if (!credentialResponse.credential) {
            setError("Google sign-in did not return a credential.");
            return;
        }

        setGoogleLoading(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/google",
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
                setError(data.message || "Google login failed.");
                return;
            }

            saveLoginData(data);
        } catch (error) {
            console.error("Google login error:", error);
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

                <h1>Welcome back</h1>

                <p className="auth-subtitle">
                    Log in to access your StudyHub account.
                </p>

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
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
                        <div className="password-label">
                            <label>Password</label>
                            
                        </div>

                      
<input
    type={showPassword ? "text" : "password"}
    name="password"
    placeholder="Enter your password"
    value={formData.password}
    onChange={handleChange}
/>

<button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    style={{
        marginTop: "8px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0
    }}
>
    {showPassword ? "Hide Password" : "Show Password"}
</button>

                    </div>

                    <button
                        type="submit"
                        className="auth-submit-btn"
                        disabled={loading || googleLoading}
                    >
                        {loading ? "Logging in..." : "Log In"}
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
                    <div style={{ flex: 1, height: "1px", background: "var(--border-color, #ddd)" }} />
                    <span style={{ fontSize: "13px", color: "var(--text-secondary, #777)" }}>
                        OR CONTINUE WITH
                    </span>
                    <div style={{ flex: 1, height: "1px", background: "var(--border-color, #ddd)" }} />
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        width: "100%"
                    }}
                >
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError("Google sign-in was unsuccessful. Please try again.")}
                        text="continue_with"
                        shape="rectangular"
                        theme="outline"
                        size="large"
                        width="300"
                    />
                </div>

                {googleLoading && (
                    <p style={{ textAlign: "center", fontSize: "13px" }}>
                        Signing in with Google...
                    </p>
                )}

                <p className="auth-footer">
                    Don't have an account?{" "}
                    <Link to="/register">
                        Create Account
                    </Link>
                </p>

                <Link to="/" className="back-link">
                    ← Back to StudyHub
                </Link>

            </div>
        </div>
    );
}

export default Login;