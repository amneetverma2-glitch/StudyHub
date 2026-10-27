
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/explore.css";
import DocumentThumbnail from "../components/DocumentThumbnail";
function Explore() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // =========================================
  // FETCH NOTES
  // =========================================

  const fetchNotes = (searchValue = "") => {
    setLoading(true);

    const url = searchValue.trim()
      ? `http://localhost:5000/api/notes?search=${encodeURIComponent(
          searchValue
        )}`
      : "http://localhost:5000/api/notes";

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch resources");
        }

        return response.json();
      })
      .then((data) => {
        setNotes(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching notes:", error);
        setLoading(false);
      });
  };

  // =========================================
  // INITIAL LOAD
  // =========================================

  useEffect(() => {
    fetchNotes();
  }, []);

  // =========================================
  // SEARCH
  // =========================================

  const handleSearch = (event) => {
    event.preventDefault();
    fetchNotes(search);
  };

  // =========================================
  // GET FILE TYPE
  // =========================================

  const getFileType = (fileName) => {
    if (!fileName) {
      return "FILE";
    }

    return fileName.split(".").pop()?.toUpperCase() || "FILE";
  };

  // =========================================
  // PREVIEW
  // =========================================

  const handlePreview = async (note) => {
    if (!note?.id) {
      alert("Resource ID is missing.");
      return;
    }

    const userData =
      localStorage.getItem("studyhub_user") ||
      localStorage.getItem("user");

    if (!userData) {
      alert("Please login to preview resources.");
      navigate("/login");
      return;
    }

    let user;

    try {
      user = JSON.parse(userData);
    } catch (error) {
      console.error("Invalid user data:", error);
      alert("Please login again.");
      navigate("/login");
      return;
    }

    const userId = user?.id || user?._id;

    if (!userId) {
      alert("Please login again.");
      navigate("/login");
      return;
    }

    // Log preview activity
    try {
      const response = await fetch(
        `http://localhost:5000/api/notes/${note.id}/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        }
      );

      if (!response.ok) {
        console.error("Preview activity could not be logged.");
      }
    } catch (error) {
      console.error("Preview activity error:", error);
    }

    // Open the frontend Preview page
    navigate(`/preview/${note.id}`);
  };

  // =========================================
  // DOWNLOAD
  // =========================================

  const handleDownload = (note) => {
    if (!note?.id || !note.file_name) {
      alert("File not available.");
      return;
    }

    const userData =
      localStorage.getItem("studyhub_user") ||
      localStorage.getItem("user");

    if (!userData) {
      alert("Please login to download resources.");
      navigate("/login");
      return;
    }

    let user;

    try {
      user = JSON.parse(userData);
    } catch (error) {
      console.error("Invalid user data:", error);
      alert("Please login again.");
      return;
    }

    const userId = user?.id || user?._id;

    if (!userId) {
      alert("Please login again.");
      return;
    }

    window.location.href =
      `http://localhost:5000/api/notes/${note.id}/download?user_id=${encodeURIComponent(
        userId
      )}`;
  };

  // =========================================
  // SAVE NOTE
  // =========================================

  const handleSave = async (note) => {
    const userData =
      localStorage.getItem("studyhub_user") ||
      localStorage.getItem("user");

    if (!userData) {
      alert("Please login to save resources.");
      navigate("/login");
      return;
    }

    let user;

    try {
      user = JSON.parse(userData);
    } catch (error) {
      console.error("Invalid user data:", error);
      alert("Please login again.");
      return;
    }

    const userId = user?.id || user?._id;

    if (!userId) {
      alert("Please login again.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/notes/${note.id}/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 409) {
        alert("This resource is already saved.");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save resource"
        );
      }

      alert("Resource saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Unable to save this resource.");
    }
  };

  // =========================================
  // UI
  // =========================================

  return (
    <div className="explore-page">

      {/* HEADER */}

      <header className="explore-header">
        <div>
          <p className="explore-label">
            STUDYHUB LIBRARY
          </p>

          <h1>
            Explore Study Materials
          </h1>

          <p>
            Find notes and resources shared by students.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="back-home-btn"
        >
          ← Dashboard
        </Link>
      </header>

      {/* SEARCH */}

      <section className="search-section">
        <form
          onSubmit={handleSearch}
          className="search-form"
        >
          <input
            type="text"
            placeholder="Search by title or subject..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          <button type="submit">
            Search
          </button>
        </form>
      </section>

      {/* RESULTS */}

      <section className="explore-results">
        <div className="results-heading">
          <div>
            <h2>
              Available Resources
            </h2>
          </div>

          <span>
            {notes.length} resource
            {notes.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="explore-message">
            Loading resources...
          </div>
        ) : notes.length === 0 ? (
          <div className="explore-message">
            No resources found.
          </div>
        ) : (
          <div className="explore-grid">
            {notes.map((note) => (
              <div
                className="explore-card"
                key={note.id}
              >

                {/* FILE THUMBNAIL */}

                

{/* FILE THUMBNAIL */}

<div className="explore-thumbnail">
  <span>{getFileType(note.file_name)}</span>

  <DocumentThumbnail
    note={note}
    fallback={
      <div className="explore-fallback-thumbnail">
        <div className="fallback-paper">
          <div className="fallback-paper-lines">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </div>

          <strong>{note.subject || "Study Material"}</strong>
          <small>{note.title || "Resource Preview"}</small>
        </div>
      </div>
    }
  />
</div>



                <div className="explore-card-content">

                  {/* SUBJECT */}

                  <p className="explore-subject">
                    {note.subject}
                  </p>

                  {/* TITLE */}

                  <h3>
                    {note.title}
                  </h3>

                  {/* INFORMATION */}

                  <div className="explore-info">
                    <span>
                      Semester: {note.semester}
                    </span>

                    <span>
                      ↓ {note.downloads || 0}
                    </span>
                  </div>

                  {/* RATING */}

                  <div className="explore-rating">
                    {note.total_reviews > 0
                      ? `⭐ ${note.avg_rating} (${note.total_reviews})`
                      : "☆ No ratings yet"}
                  </div>

                  {/* ACTION BUTTONS */}

                  <div className="explore-actions">
                    <button
                      type="button"
                      className="explore-preview-btn"
                      onClick={() => handlePreview(note)}
                    >
                      Preview
                    </button>

                    <button
                      type="button"
                      className="explore-download-btn"
                      onClick={() => handleDownload(note)}
                    >
                      Download
                    </button>

                    <button
                      type="button"
                      className="explore-save-btn"
                      onClick={() => handleSave(note)}
                    >
                      ♡ Save
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Explore;
