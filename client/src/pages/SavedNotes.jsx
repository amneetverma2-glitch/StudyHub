import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/savedNotes.css";
import API_URL from "../api";

function SavedNotes() {
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  // ================================
  // LOAD SAVED NOTES
  // ================================

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/user/${userId}/saved-notes`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load saved notes");
        }

        return res.json();
      })
      .then((data) => {
        setNotes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading saved notes:", error);
        setLoading(false);
      });
  }, [userId]);

  // ================================
  // REMOVE SAVED NOTE
  // ================================

  const removeSavedNote = async (noteId) => {
    if (!userId) {
      alert("Please login first.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/notes/${noteId}/save`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.message || "Failed to remove saved note"
        );
      }

      // Remove from screen immediately
      setNotes((currentNotes) =>
        currentNotes.filter((note) => note.id !== noteId)
      );

    } catch (error) {
      console.error("Error removing saved note:", error);
      alert("Could not remove this note. Please try again.");
    }
  };

  // ================================
  // GET FILE TYPE
  // ================================

  const getFileType = (fileName) => {
    if (!fileName) {
      return "FILE";
    }

    const extension = fileName
      .split(".")
      .pop()
      .toUpperCase();

    return extension;
  };

  // ================================
  // NO USER
  // ================================

  if (!userId) {
    return (
      <div className="saved-page">
        <div className="empty-message">
          <h3>Please login to view saved notes.</h3>

          <Link to="/login" className="explore-btn">
            Login
          </Link>
        </div>
      </div>
    );
  }

  // ================================
  // PAGE
  // ================================

  return (
    <div className="saved-page">

      {/* ================================
          HEADER
      ================================ */}

      <div className="saved-header">

        <div>

          <span className="section-label">
            YOUR COLLECTION
          </span>

          <h1>Saved Notes</h1>

          <p>
            Resources you've saved for quick access later.
          </p>

        </div>

        <Link
          to="/explore"
          className="explore-btn"
        >
          Explore Resources
        </Link>

      </div>


      {/* ================================
          STATS
      ================================ */}

      <div className="saved-stats">

        <div className="saved-stat-card">

          <div className="stat-icon purple">
            ♡
          </div>

          <div>
            <span>Saved Resources</span>

            <strong>
              {notes.length}
            </strong>
          </div>

        </div>


        <div className="saved-stat-card">

          <div className="stat-icon green">
            ↓
          </div>

          <div>

            <span>Total Downloads</span>

            <strong>
              {notes.reduce(
                (total, note) =>
                  total + Number(note.downloads || 0),
                0
              )}
            </strong>

          </div>

        </div>


        <div className="saved-stat-card">

          <div className="stat-icon orange">
            ↗
          </div>

          <div>

            <span>Showing</span>

            <strong>
              {notes.length}
            </strong>

          </div>

        </div>

      </div>


      {/* ================================
          SAVED RESOURCES
      ================================ */}

      <div className="saved-container">

        <div className="saved-container-header">

          <div>

            <span className="section-label">
              YOUR COLLECTION
            </span>

            <h2>Saved Resources</h2>

            <p>
              Your bookmarked study materials.
            </p>

          </div>

          <span className="resource-count">
            {notes.length} resources
          </span>

        </div>


        {/* ================================
            LOADING
        ================================ */}

        {loading ? (

          <div className="empty-message">
            Loading saved resources...
          </div>

        ) : notes.length === 0 ? (

          /* ================================
             EMPTY STATE
          ================================ */

          <div className="empty-message">

            <div className="empty-icon">
              ♡
            </div>

            <h3>
              No saved resources yet
            </h3>

            <p>
              Explore StudyHub and save resources
              you want to access later.
            </p>

            <Link
              to="/explore"
              className="explore-btn"
            >
              Explore Resources
            </Link>

          </div>

        ) : (

          /* ================================
             SAVED NOTES LIST
          ================================ */

          <div className="saved-list">

            {notes.map((note) => (

              <div
                className="saved-row"
                key={note.id}
              >

                {/* ================================
                    FILE TYPE
                ================================ */}

                <div className="file-icon">

                  <strong>
                    {getFileType(note.file_name)}
                  </strong>

                </div>


                {/* ================================
                    NOTE INFORMATION
                ================================ */}

                <div className="saved-info">

                  <h3>
                    {note.title}
                  </h3>

                  <p className="description">
                    {note.description}
                  </p>

                  <div className="note-meta">

                    <span>
                      {note.subject}
                    </span>

                    <span>
                      •
                    </span>

                    <span>
                      {note.semester} Semester
                    </span>

                    {note.uploader_name && (
                      <>
                        <span>
                          •
                        </span>

                        <span>
                          By {note.uploader_name}
                        </span>
                      </>
                    )}

                  </div>

                </div>


                {/* ================================
                    DOWNLOAD COUNT
                ================================ */}

                <div className="download-info">

                  <strong>
                    {note.downloads || 0}
                  </strong>

                  <span>
                    downloads
                  </span>

                </div>


                {/* ================================
                    ACTIONS
                ================================ */}

                <div className="saved-actions">

                  {/* PREVIEW */}

                 
<button
  className="preview-btn"
  onClick={() => {
    if (!note.id) {
      alert("Note ID is missing. Please refresh the page and try again.");
      return;
    }

    navigate(`/preview/${note.id}`);
  }}
>
  Preview
</button>



                  {/* DOWNLOAD */}

                  <a
                    className="download-btn"
                    href={`${API_URL}/api/notes/${note.id}/download?user_id=${userId}`}
                  >
                    Download
                  </a>


                  {/* REMOVE */}

                  <button
                    className="remove-btn"
                    onClick={() =>
                      removeSavedNote(note.id)
                    }
                    title="Remove from saved notes"
                  >
                    Remove
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}

export default SavedNotes;