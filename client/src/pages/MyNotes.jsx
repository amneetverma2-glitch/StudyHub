import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/myNotes.css";
import API_URL from "../api";

function MyNotes() {

    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [notes, setNotes] = useState([]);
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    // =========================================
    // LOAD USER + NOTES
    // =========================================

    useEffect(() => {

        const storedUser =
            localStorage.getItem("studyhub_user") ||
            localStorage.getItem("user");

        if (!storedUser) {
            navigate("/login");
            return;
        }

        let loggedUser;

        try {
            loggedUser = JSON.parse(storedUser);
        } catch (err) {
            console.error("Invalid user data:", err);
            navigate("/login");
            return;
        }

        setUser(loggedUser);


        fetch(
           `${API_URL}/api/user/${loggedUser.id}/notes`
        )
            .then((response) => {

                if (!response.ok) {
                    throw new Error("Failed to load notes");
                }

                return response.json();
            })
            .then((data) => {

                setNotes(
                    Array.isArray(data) ? data : []
                );

                setLoading(false);
            })
            .catch((err) => {

                console.error(
                    "My notes loading error:",
                    err
                );

                setError(
                    "Unable to load your resources."
                );

                setLoading(false);
            });

    }, [navigate]);


    // =========================================
    // SEARCH
    // =========================================

    const filteredNotes = useMemo(() => {

        const value = search
            .trim()
            .toLowerCase();

        if (!value) {
            return notes;
        }

        return notes.filter((note) => {

            return (
                note.title
                    ?.toLowerCase()
                    .includes(value) ||

                note.subject
                    ?.toLowerCase()
                    .includes(value) ||

                note.semester
                    ?.toLowerCase()
                    .includes(value)
            );

        });

    }, [notes, search]);


    // =========================================
    // TOTAL DOWNLOADS
    // =========================================

    const totalDownloads = notes.reduce(
        (total, note) =>
            total + Number(note.downloads || 0),
        0
    );


    // =========================================
    // PREVIEW
    // =========================================

  
const handlePreview = (note) => {
    if (!note.id) {
        alert("Note ID is missing. Please refresh the page and try again.");
        return;
    }

    navigate(`/preview/${note.id}`);
};


    // =========================================
    // DOWNLOAD
    // =========================================

    const handleDownload = (note) => {

        if (!note.file_name) {
            alert("File not available.");
            return;
        }

        const storedUser =
            localStorage.getItem("studyhub_user") ||
            localStorage.getItem("user");

        if (!storedUser) {
            navigate("/login");
            return;
        }

        const loggedUser = JSON.parse(storedUser);


        window.location.href =
    `${API_URL}/api/notes/${note.id}/download?user_id=${loggedUser.id}`;
};


    // =========================================
    // FILE TYPE
    // =========================================

    const getFileType = (fileName) => {

        if (!fileName) {
            return "FILE";
        }

        const extension =
            fileName
                .split(".")
                .pop()
                .toUpperCase();

        return extension;
    };


    // =========================================
    // FILE ICON
    // =========================================

    const getFileIcon = (fileName) => {

        const type =
            getFileType(fileName);

        if (type === "PDF") {
            return "P";
        }

        if (
            type === "DOC" ||
            type === "DOCX"
        ) {
            return "W";
        }

        if (
            type === "PPT" ||
            type === "PPTX"
        ) {
            return "S";
        }

        return "F";
    };


    // =========================================
    // USER INITIAL
    // =========================================

    const userInitial =
        user?.fullname
            ?.charAt(0)
            ?.toUpperCase() || "A";


    // =========================================
    // LOGOUT
    // =========================================

    const handleLogout = () => {

        localStorage.removeItem("studyhub_token");
        localStorage.removeItem("studyhub_user");
        localStorage.removeItem("user");

        navigate("/login");
    };


    // =========================================
    // DATE FORMAT
    // =========================================

    const formatDate = (date) => {

        if (!date) {
            return "Unknown date";
        }

        const parsedDate =
            new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Unknown date";
        }

        return parsedDate.toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
    };


    // =========================================
    // WAIT FOR USER
    // =========================================

    if (!user) {
        return null;
    }


    return (

        <div className="my-notes-page">


            {/* =====================================
                SIDEBAR
            ===================================== */}

            <aside className="my-notes-sidebar">

                <div className="my-notes-brand">

                    <h2>
                        Study<span>Hub</span>
                    </h2>

                    <p>
                        Academic Center
                    </p>

                </div>


                <Link
                    to="/upload"
                    className="my-notes-upload-btn"
                >
                    + Upload Resource
                </Link>


                <nav className="my-notes-menu">

                    <Link
                        to="/dashboard"
                        className="my-notes-nav-link"
                    >
                        <span>▦</span>
                        Overview
                    </Link>


                    <Link
                        to="/my-notes"
                        className="my-notes-nav-link active"
                    >
                        <span>▤</span>
                        My Notes
                    </Link>


                    <Link
                        to="/explore"
                        className="my-notes-nav-link"
                    >
                        <span>⌕</span>
                        Explore
                    </Link>


                    <Link
                        to="/saved-notes"
                        className="my-notes-nav-link"
                    >
                        <span>♡</span>
                        Saved Notes
                    </Link>


                    <Link
                        to="/community"
                        className="my-notes-nav-link"
                    >
                        <span>♧</span>
                        Community
                    </Link>

                </nav>


                <div className="my-notes-sidebar-bottom">

                    <Link
                        to="/settings"
                        className="my-notes-nav-link"
                    >
                        <span>⚙</span>
                        Settings
                    </Link>


                    <button
                        className="my-notes-nav-link"
                        onClick={handleLogout}
                    >
                        <span>↪</span>
                        Log out
                    </button>

                </div>

            </aside>


            {/* =====================================
                MAIN
            ===================================== */}

            <main className="my-notes-main">


                {/* TOP BAR */}

                <header className="my-notes-topbar">

                    <div className="my-notes-search">

                        <span>⌕</span>

                        <input
                            type="text"
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                            placeholder="Search your resources..."
                        />

                    </div>


                    <div className="my-notes-top-actions">

                        <button
                            className="my-notes-notification"
                            title="Notifications"
                        >
                            ♧
                        </button>


                        <div className="my-notes-avatar">
                            {userInitial}
                        </div>

                    </div>

                </header>


                {/* =====================================
                    CONTENT
                ===================================== */}

                <div className="my-notes-content">


                    {/* PAGE HEADER */}

                    <section className="my-notes-heading">

                        <div>

                            <p className="my-notes-eyebrow">
                                YOUR CONTRIBUTIONS
                            </p>

                            <h1>
                                My Notes
                            </h1>

                            <p>
                                Manage and access the study
                                resources you've shared.
                            </p>

                        </div>


                        <Link
                            to="/upload"
                            className="my-notes-header-btn"
                        >
                            + Upload Resource
                        </Link>

                    </section>


                    {/* =================================
                        SUMMARY
                    ================================= */}

                    <section className="my-notes-stats">

                        <div className="my-notes-stat">

                            <span className="my-notes-stat-icon">
                                ↑
                            </span>

                            <div>

                                <small>
                                    Resources
                                </small>

                                <strong>
                                    {loading
                                        ? "..."
                                        : notes.length}
                                </strong>

                            </div>

                        </div>


                        <div className="my-notes-stat">

                            <span className="my-notes-stat-icon download">
                                ↓
                            </span>

                            <div>

                                <small>
                                    Total Downloads
                                </small>

                                <strong>
                                    {loading
                                        ? "..."
                                        : totalDownloads}
                                </strong>

                            </div>

                        </div>


                        <div className="my-notes-stat">

                            <span className="my-notes-stat-icon search">
                                ⌕
                            </span>

                            <div>

                                <small>
                                    Showing
                                </small>

                                <strong>
                                    {loading
                                        ? "..."
                                        : filteredNotes.length}
                                </strong>

                            </div>

                        </div>

                    </section>


                    {/* =================================
                        RESOURCE LIST
                    ================================= */}

                    <section className="my-notes-card">

                        <div className="my-notes-card-header">

                            <div>

                                <p>
                                    YOUR RESOURCES
                                </p>

                                <h2>
                                    Uploaded Materials
                                </h2>

                            </div>


                            {!loading &&
                                notes.length > 0 && (
                                    <span>
                                        {filteredNotes.length}{" "}
                                        {filteredNotes.length === 1
                                            ? "resource"
                                            : "resources"}
                                    </span>
                                )}

                        </div>


                        {/* ERROR */}

                        {error && (

                            <div className="my-notes-error">
                                {error}
                            </div>

                        )}


                        {/* LOADING */}

                        {loading && (

                            <div className="my-notes-loading">
                                Loading your resources...
                            </div>

                        )}


                        {/* EMPTY */}

                        {!loading &&
                            !error &&
                            notes.length === 0 && (

                                <div className="my-notes-empty">

                                    <div className="my-notes-empty-icon">
                                        ↑
                                    </div>

                                    <h3>
                                        You haven't uploaded anything yet
                                    </h3>

                                    <p>
                                        Share your notes and study
                                        materials with other students
                                        on StudyHub.
                                    </p>

                                    <Link to="/upload">
                                        Upload Your First Resource →
                                    </Link>

                                </div>

                            )}


                        {/* NO SEARCH RESULTS */}

                        {!loading &&
                            !error &&
                            notes.length > 0 &&
                            filteredNotes.length === 0 && (

                                <div className="my-notes-empty">

                                    <div className="my-notes-empty-icon">
                                        ⌕
                                    </div>

                                    <h3>
                                        No resources found
                                    </h3>

                                    <p>
                                        Try searching with a different
                                        title, subject or semester.
                                    </p>

                                </div>

                            )}


                        {/* RESOURCE CARDS */}

                        {!loading &&
                            !error &&
                            filteredNotes.length > 0 && (

                                <div className="my-notes-list">

                                    {filteredNotes.map(
                                        (note) => (

                                            <article
                                                className="my-note-item"
                                                key={note.id}
                                            >

                                                {/* FILE ICON */}

                                                <div
                                                    className={`my-note-file-icon ${getFileType(
                                                        note.file_name
                                                    ).toLowerCase()}`}
                                                >
                                                    <strong>
                                                        {getFileIcon(
                                                            note.file_name
                                                        )}
                                                    </strong>

                                                    <small>
                                                        {getFileType(
                                                            note.file_name
                                                        )}
                                                    </small>
                                                </div>


                                                {/* INFORMATION */}

                                                <div className="my-note-info">

                                                    <h3
                                                        title={note.title}
                                                    >
                                                        {note.title}
                                                    </h3>

                                                    <p>
                                                        {note.description ||
                                                            "No description provided."}
                                                    </p>


                                                    <div className="my-note-meta">

                                                        <span>
                                                            {note.subject}
                                                        </span>

                                                        <span>
                                                            {note.semester}
                                                        </span>

                                                        <span>
                                                            Uploaded{" "}
                                                            {formatDate(
                                                                note.upload_date
                                                            )}
                                                        </span>

                                                    </div>

                                                </div>


                                                {/* DOWNLOADS */}

                                                <div className="my-note-downloads">

                                                    <strong>
                                                        {Number(
                                                            note.downloads || 0
                                                        )}
                                                    </strong>

                                                    <span>
                                                        {Number(
                                                            note.downloads || 0
                                                        ) === 1
                                                            ? "download"
                                                            : "downloads"}
                                                    </span>

                                                </div>


                                                {/* ACTIONS */}

                                                <div className="my-note-actions">

                                                    <button
                                                        onClick={() =>
                                                            handlePreview(
                                                                note
                                                            )
                                                        }
                                                    >
                                                        Preview
                                                    </button>


                                                    <button
                                                        className="primary"
                                                        onClick={() =>
                                                            handleDownload(
                                                                note
                                                            )
                                                        }
                                                    >
                                                        Download
                                                    </button>

                                                </div>

                                            </article>

                                        )
                                    )}

                                </div>

                            )}

                    </section>

                </div>

            </main>

        </div>
    );
}

export default MyNotes;