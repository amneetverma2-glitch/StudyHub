
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import MyNotes from "./pages/MyNotes";
import SavedNotes from "./pages/SavedNotes";
import Preview from "./pages/Preview";
import Settings from "./pages/Settings";
import Community from "./pages/Community";

// Read the currently logged-in user.
function getCurrentUser() {
  try {
    const storedUser =
      localStorage.getItem("studyhub_user") ||
      localStorage.getItem("user");

    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

// Create a separate theme-storage key for each user.
function getUserThemeKey(user) {
  if (!user) return null;

  const identifier =
    user._id ||
    user.id ||
    user.email ||
    user.username;

  if (!identifier) return null;

  return `studyhub_theme_${String(identifier).toLowerCase()}`;
}

function AppRoutes() {
  const location = useLocation();
  const [theme, setTheme] = useState("light");

  // Restore the correct user's theme when the route changes,
  // including after login or logout.
  useEffect(() => {
    const user = getCurrentUser();
    const themeKey = getUserThemeKey(user);

    const savedTheme = themeKey
      ? localStorage.getItem(themeKey)
      : null;

    setTheme(savedTheme === "dark" ? "dark" : "light");
  }, [location.pathname]);

  // Apply the current theme to the entire website.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  
  useEffect(() => {
    const pageTitles = {
      "/": "StudyHub — Student Learning Platform",
      "/login": "Login — StudyHub",
      "/register": "Create Account — StudyHub",
      "/dashboard": "Dashboard — StudyHub",
      "/explore": "Explore Resources — StudyHub",
      "/my-notes": "My Notes — StudyHub",
      "/saved-notes": "Saved Notes — StudyHub",
      "/upload": "Upload Resources — StudyHub",
      "/community": "Community — StudyHub",
      "/settings": "Settings — StudyHub",
    };

    const title =
      location.pathname.startsWith("/preview/")
        ? "Note Preview — StudyHub"
        : pageTitles[location.pathname] || "StudyHub";

    document.title = title;
  }, [location.pathname]);

  // Save the theme against the currently logged-in user.
  const handleThemeChange = (selectedTheme) => {
    const user = getCurrentUser();
    const themeKey = getUserThemeKey(user);

    if (themeKey) {
      localStorage.setItem(themeKey, selectedTheme);
    }

    setTheme(selectedTheme);
  };

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/my-notes" element={<MyNotes />} />
      <Route path="/saved-notes" element={<SavedNotes />} />
      <Route path="/preview/:id" element={<Preview />} />

      <Route
        path="/settings"
        element={
          <Settings
            theme={theme}
            onThemeChange={handleThemeChange}
          />
        }
      />

      <Route path="/community" element={<Community />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
