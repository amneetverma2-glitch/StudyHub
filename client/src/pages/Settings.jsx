
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/settings.css";

function Settings({ theme, onThemeChange }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    username: "",
    institution: "",
  });
  
const [showPasswordForm, setShowPasswordForm] = useState(false);
const [passwordData, setPasswordData] = useState({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const [passwordMessage, setPasswordMessage] = useState("");
const [passwordLoading, setPasswordLoading] = useState(false);


  useEffect(() => {
    const storedUser =
      localStorage.getItem("studyhub_user") ||
      localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      setFormData({
        fullname:
          parsedUser.fullname ||
          parsedUser.full_name ||
          parsedUser.name ||
          "",
        email: parsedUser.email || "",
        username: parsedUser.username || "",
        institution: parsedUser.institution || "",
      });
    } catch (error) {
      console.error("Unable to read user details:", error);
      navigate("/login");
    }
  }, [navigate]);


 const handleThemeChange = (selectedTheme) => {
  onThemeChange(selectedTheme);
  setMessage("");
};

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleProfileSave = () => {
    if (!formData.fullname.trim() || !formData.email.trim()) {
      setMessage("Full name and email are required.");
      return;
    }

    const updatedUser = {
      ...user,
      fullname: formData.fullname.trim(),
      name: formData.fullname.trim(),
      email: formData.email.trim(),
      username: formData.username.trim(),
      institution: formData.institution.trim(),
    };

    localStorage.setItem("studyhub_user", JSON.stringify(updatedUser));

    // Keep the legacy user key in sync if it exists.
    if (localStorage.getItem("user")) {
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }

    setUser(updatedUser);
    setEditing(false);
    setMessage("Profile saved on this device.");
  };

  
const handlePasswordChange = async (event) => {
  event.preventDefault();
  setPasswordMessage("");

  const { currentPassword, newPassword, confirmPassword } =
    passwordData;

  if (!currentPassword || !newPassword || !confirmPassword) {
    setPasswordMessage("Please fill in all password fields.");
    return;
  }

  if (newPassword.length < 8) {
    setPasswordMessage("New password must be at least 8 characters.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordMessage("New password and confirm password do not match.");
    return;
  }

  if (currentPassword === newPassword) {
    setPasswordMessage("New password must be different from the current password.");
    return;
  }

  try {
    setPasswordLoading(true);

    const token = localStorage.getItem("studyhub_token");

    const response = await fetch("/api/auth/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Unable to change password.");
    }

    setPasswordMessage(result.message || "Password changed successfully.");

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setShowPasswordForm(false);
  } catch (error) {
    setPasswordMessage(
      error.message || "Something went wrong. Please try again."
    );
  } finally {
    setPasswordLoading(false);
  }
};

  const handleLogout = () => {
    localStorage.removeItem("studyhub_token");
    localStorage.removeItem("studyhub_user");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  const displayName =
    user.fullname || user.full_name || user.name || "Student";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="settings-page">
      {/* Fixed Sidebar */}
      <aside className="settings-sidebar">
        <Link to="/dashboard" className="settings-brand">
          <h2>
            Study<span>Hub</span>
          </h2>
          <p>Academic Center</p>
        </Link>

        <Link to="/upload" className="settings-upload-btn">
          + Upload Resource
        </Link>

        <nav className="settings-nav">
          <Link to="/dashboard" className="settings-nav-link">
            <span className="settings-nav-icon">▦</span>
            <span>Overview</span>
          </Link>

          <Link to="/my-notes" className="settings-nav-link">
            <span className="settings-nav-icon">▤</span>
            <span>My Notes</span>
          </Link>

          <Link to="/explore" className="settings-nav-link">
            <span className="settings-nav-icon">⌕</span>
            <span>Explore</span>
          </Link>

          <Link to="/saved-notes" className="settings-nav-link">
            <span className="settings-nav-icon">♡</span>
            <span>Saved Notes</span>
          </Link>

          <Link to="/dashboard" className="settings-nav-link">
            <span className="settings-nav-icon">♧</span>
            <span>Community</span>
          </Link>
        </nav>

        <div className="settings-sidebar-bottom">
          <Link
            to="/settings"
            className="settings-nav-link settings-nav-active"
          >
            <span className="settings-nav-icon">⚙</span>
            <span>Settings</span>
          </Link>

          <button
            type="button"
            className="settings-nav-link settings-logout-btn"
            onClick={handleLogout}
          >
            <span className="settings-nav-icon">↪</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Settings Content */}
      <main className="settings-main">
        <header className="settings-header">
          <div className="settings-eyebrow">STUDYHUB</div>
          <h1>Settings</h1>
          <p>Manage your account and workspace preferences.</p>
        </header>

        {/* Appearance */}
        <section className="settings-card">
          <div className="settings-section-heading">
            <div className="settings-section-icon appearance-icon">
              🎨
            </div>

            <div>
              <h2>Appearance</h2>
              <p>Choose your preferred theme.</p>
            </div>
          </div>

          <div className="settings-theme-options">
            <button
              type="button"
              className={`settings-theme-option ${
                theme === "light" ? "selected" : ""
              }`}
              onClick={() => handleThemeChange("light")}
            >
              <span className="theme-emoji">☀️</span>
              <span className="theme-option-text">
                <strong>Light Mode</strong>
                <small>Clean and bright</small>
              </span>
              {theme === "light" && (
                <span className="theme-check">✓</span>
              )}
            </button>

            <button
              type="button"
              className={`settings-theme-option ${
                theme === "dark" ? "selected" : ""
              }`}
              onClick={() => handleThemeChange("dark")}
            >
              <span className="theme-emoji">🌙</span>
              <span className="theme-option-text">
                <strong>Dark Mode</strong>
                <small>Comfortable at night</small>
              </span>
              {theme === "dark" && (
                <span className="theme-check">✓</span>
              )}
            </button>
          </div>
        </section>

        {/* Account Profile */}
        <section className="settings-card">
          <div className="settings-profile-heading">
            <div className="settings-section-heading">
              <div className="settings-section-icon profile-icon">
                👤
              </div>

              <div>
                <h2>Account Profile</h2>
                <p>Your account details.</p>
              </div>
            </div>

            <button
              type="button"
              className="settings-secondary-btn"
              onClick={() => {
                setEditing((previous) => !previous);
                setMessage("");
              }}
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          <div className="settings-user-summary">
            <div className="settings-avatar">{initials || "S"}</div>

            <div className="settings-user-info">
              <strong>{displayName}</strong>
              <span>{user.email || "No email provided"}</span>
            </div>
          </div>

          {editing && (
            <div className="settings-profile-form">
              <div className="settings-form-grid">
                <label className="settings-field">
                  <span>Full Name</span>
                  <input
                    type="text"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                  />
                </label>

                <label className="settings-field">
                  <span>Email Address</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email"
                    required
                  />
                </label>

                <label className="settings-field">
                  <span>Username</span>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                  />
                </label>

                <label className="settings-field">
                  <span>Institution</span>
                  <input
                    type="text"
                    name="institution"
                    value={formData.institution}
                    onChange={handleInputChange}
                    placeholder="Enter institution"
                  />
                </label>
              </div>

              <button
                type="button"
                className="settings-primary-btn"
                onClick={handleProfileSave}
              >
                Save Profile
              </button>
            </div>
          )}

          {message && (
            <p className="settings-message" role="status">
              {message}
            </p>
          )}
        </section>

        {/* Compact Security and Notifications */}
        <div className="settings-bottom-grid">
          
<section className="settings-card settings-info-card">
  <div className="settings-section-heading">
    <div className="settings-section-icon security-icon">
      🔒
    </div>

    <div>
      <h2>Privacy &amp; Security</h2>
      <p>Keep your account secure.</p>
    </div>
  </div>

  <div className="settings-info-row settings-password-row">
    <div>
      <strong>Password &amp; Login</strong>
      <p>Update your account password securely.</p>
    </div>

    <button
      type="button"
      className="settings-secondary-btn"
      onClick={() => {
        setShowPasswordForm((previous) => !previous);
        setPasswordMessage("");
      }}
    >
      {showPasswordForm ? "Cancel" : "Change Password"}
    </button>
  </div>

  {showPasswordForm && (
    <form
      className="settings-password-form"
      onSubmit={handlePasswordChange}
    >
      <label className="settings-field">
        <span>Current Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={passwordData.currentPassword}
          onChange={(event) =>
            setPasswordData({
              ...passwordData,
              currentPassword: event.target.value,
            })
          }
          placeholder="Enter current password"
          required
        />
      </label>

      <label className="settings-field">
        <span>New Password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={passwordData.newPassword}
          onChange={(event) =>
            setPasswordData({
              ...passwordData,
              newPassword: event.target.value,
            })
          }
          placeholder="Minimum 8 characters"
          minLength={8}
          required
        />
      </label>

      <label className="settings-field">
        <span>Confirm New Password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={passwordData.confirmPassword}
          onChange={(event) =>
            setPasswordData({
              ...passwordData,
              confirmPassword: event.target.value,
            })
          }
          placeholder="Re-enter new password"
          minLength={8}
          required
        />
      </label>

      <button
        type="submit"
        className="settings-primary-btn"
        disabled={passwordLoading}
      >
        {passwordLoading ? "Updating..." : "Update Password"}
      </button>
    </form>
  )}

  {passwordMessage && (
    <p className="settings-message" role="status">
      {passwordMessage}
    </p>
  )}
</section>

        </div>

        <footer className="settings-footer">
          <span>
            Signed in as <strong>{displayName}</strong>
          </span>

          <button
            type="button"
            className="settings-secondary-btn"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </footer>
      </main>
    </div>
  );
}

export default Settings;
