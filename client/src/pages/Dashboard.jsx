import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

function Dashboard() {

    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [notes, setNotes] = useState([]);
    const [savedNotes, setSavedNotes] = useState([]);
    const [activities, setActivities] = useState([]);

    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(true);


    // =========================================
    // LOAD DASHBOARD DATA
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
        } catch (error) {
            console.error("Invalid user data:", error);
            navigate("/login");
            return;
        }

        setUser(loggedUser);


        // -----------------------------------------
        // GET USER UPLOADED NOTES
        // -----------------------------------------

        fetch(
            `http://localhost:5000/api/user/${loggedUser.id}/notes`
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
            .catch((error) => {

                console.error(
                    "Notes loading error:",
                    error
                );

                setNotes([]);
                setLoading(false);
            });


        // -----------------------------------------
        // GET SAVED NOTES
        // -----------------------------------------

        fetch(
            `http://localhost:5000/api/user/${loggedUser.id}/saved-notes`
        )
            .then((response) => {

                if (!response.ok) {
                    throw new Error("Failed to load saved notes");
                }

                return response.json();
            })
            .then((data) => {

                setSavedNotes(
                    Array.isArray(data) ? data : []
                );
            })
            .catch((error) => {

                console.error(
                    "Saved notes loading error:",
                    error
                );

                setSavedNotes([]);
            });


        // -----------------------------------------
        // GET RECENT ACTIVITY
        // -----------------------------------------

        fetch(
            `http://localhost:5000/api/user/${loggedUser.id}/recent-activity`
        )
            .then((response) => {

                if (!response.ok) {
                    throw new Error("Failed to load activity");
                }

                return response.json();
            })
            .then((data) => {

                setActivities(
                    Array.isArray(data) ? data : []
                );

                setActivityLoading(false);
            })
            .catch((error) => {

                console.error(
                    "Activity loading error:",
                    error
                );

                setActivities([]);
                setActivityLoading(false);
            });

    }, [navigate]);


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
    // TOTAL DOWNLOADS
    // =========================================

    const totalDownloads = notes.reduce(
        (total, note) => {
            return total + Number(note.downloads || 0);
        },
        0
    );


    // =========================================
    // RESOURCE PERFORMANCE
    //
    // Sort resources according to downloads
    // and show top 5.
    // =========================================

    const topResources = useMemo(() => {

        return [...notes]
            .sort(
                (a, b) =>
                    Number(b.downloads || 0) -
                    Number(a.downloads || 0)
            )
            .slice(0, 5);

    }, [notes]);


    // =========================================
    // MAX DOWNLOAD
    // =========================================

    const maxDownloads = Math.max(
        ...topResources.map(
            (note) => Number(note.downloads || 0)
        ),
        1
    );


    // =========================================
    // AVERAGE DOWNLOADS
    // =========================================

    const averageDownloads =
        notes.length > 0
            ? (totalDownloads / notes.length).toFixed(1)
            : "0";


    // =========================================
    // MOST DOWNLOADED RESOURCE
    // =========================================

    const mostDownloaded =
        topResources.length > 0
            ? topResources[0]
            : null;


    // =========================================
    // USER INITIAL
    // =========================================

    const userInitial =
        user?.fullname
            ?.charAt(0)
            ?.toUpperCase() || "A";


    // =========================================
    // ACTIVITY ICON
    // =========================================

    const getActivityIcon = (type) => {

        switch (type) {

            case "upload":
                return "↑";

            case "download":
                return "↓";

            case "preview":
                return "◉";

            case "save":
                return "♡";

            default:
                return "•";
        }
    };


    // =========================================
    // ACTIVITY TEXT
    // =========================================

    const getActivityText = (activity) => {

        const title =
            activity.title || "Resource";

        switch (activity.activity_type) {

            case "upload":
                return (
                    <>
                        You uploaded{" "}
                        <strong>{title}</strong>
                    </>
                );

            case "download":
                return (
                    <>
                        You downloaded{" "}
                        <strong>{title}</strong>
                    </>
                );

            case "preview":
                return (
                    <>
                        You previewed{" "}
                        <strong>{title}</strong>
                    </>
                );

            case "save":
                return (
                    <>
                        You saved{" "}
                        <strong>{title}</strong>
                    </>
                );

            default:
                return (
                    <>
                        Activity on{" "}
                        <strong>{title}</strong>
                    </>
                );
        }
    };


    // =========================================
    // TIME AGO
    // =========================================

    const getTimeAgo = (date) => {

        if (!date) {
            return "";
        }

        const activityDate = new Date(date);
        const now = new Date();

        const seconds = Math.floor(
            (now - activityDate) / 1000
        );

        if (seconds < 60) {
            return "Just now";
        }

        const minutes = Math.floor(
            seconds / 60
        );

        if (minutes < 60) {
            return `${minutes} min ago`;
        }

        const hours = Math.floor(
            minutes / 60
        );

        if (hours < 24) {
            return `${hours} hr ago`;
        }

        const days = Math.floor(
            hours / 24
        );

        if (days === 1) {
            return "Yesterday";
        }

        return `${days} days ago`;
    };


    // =========================================
    // LOADING USER
    // =========================================

    if (!user) {
        return null;
    }


    return (

        <div className="dashboard-page">


            {/* =====================================
                SIDEBAR
            ===================================== */}

            <aside className="dashboard-sidebar">

                <div className="sidebar-brand">

                    <h2>
                        Study<span>Hub</span>
                    </h2>

                    <p>
                        Academic Center
                    </p>

                </div>


                <Link
                    to="/upload"
                    className="sidebar-upload-btn"
                >
                    + Upload Resource
                </Link>


                <nav className="sidebar-menu">

                    <Link
                        to="/dashboard"
                        className="sidebar-link active"
                    >
                        <span>▦</span>
                        Overview
                    </Link>


                    <Link
                        to="/my-notes"
                        className="sidebar-link"
                    >
                        <span>▤</span>
                        My Notes
                    </Link>


                    <Link
                        to="/explore"
                        className="sidebar-link"
                    >
                        <span>⌕</span>
                        Explore
                    </Link>


                    <Link
                        to="/saved-notes"
                        className="sidebar-link"
                    >
                        <span>♡</span>
                        Saved Notes
                    </Link>


                    <Link
                        to="/community"
                        className="sidebar-link"
                    >
                        <span>♧</span>
                        Community
                    </Link>

                </nav>


                <div className="sidebar-bottom">

                    <Link
                        to="/settings"
                        className="sidebar-link"
                    >
                        <span>⚙</span>
                        Settings
                    </Link>


                    <button
                        className="sidebar-link logout-link"
                        onClick={handleLogout}
                    >
                        <span>↪</span>
                        Log out
                    </button>

                </div>

            </aside>


            {/* =====================================
                MAIN CONTENT
            ===================================== */}

            <main className="dashboard-main">


                {/* =================================
                    TOP BAR
                ================================= */}

             


                {/* =================================
                    PAGE CONTENT
                ================================= */}

                <div className="dashboard-content">


                    {/* =================================
                        WELCOME
                    ================================= */}

                    <section className="dashboard-heading">

                        <div>

                            <p className="dashboard-eyebrow">
                                STUDYHUB
                            </p>

                            <h1>
                                Welcome back,{" "}
                                {user.fullname} 👋
                            </h1>

                            <p className="dashboard-welcome">
                                Here's what's happening with your
                                resources today.
                            </p>

                        </div>

                    </section>


                    {/* =================================
                        STAT CARDS
                    ================================= */}

                    <section className="stats-grid">


                        {/* UPLOADS */}

                        <div className="stat-card">

                            <div className="stat-icon upload-stat">
                                ↑
                            </div>

                            <div className="stat-content">

                                <span>
                                    Resources Shared
                                </span>

                                <strong>
                                    {loading
                                        ? "..."
                                        : notes.length}
                                </strong>

                                <small>
                                    Your uploaded resources
                                </small>

                            </div>

                        </div>


                        {/* DOWNLOADS */}

                        <div className="stat-card">

                            <div className="stat-icon download-stat">
                                ↓
                            </div>

                            <div className="stat-content">

                                <span>
                                    Downloads Received
                                </span>

                                <strong>
                                    {loading
                                        ? "..."
                                        : totalDownloads}
                                </strong>

                                <small>
                                    On your shared resources
                                </small>

                            </div>

                        </div>


                        {/* SAVED */}

                        <div className="stat-card">

                            <div className="stat-icon save-stat">
                                ♡
                            </div>

                            <div className="stat-content">

                                <span>
                                    Saved Notes
                                </span>

                                <strong>
                                    {savedNotes.length}
                                </strong>

                                <small>
                                    Resources saved for later
                                </small>

                            </div>

                        </div>

                    </section>


                    {/* =================================
                        ANALYTICS
                    ================================= */}

                    <section className="analytics-grid">


                        {/* =================================
                            RESOURCE PERFORMANCE
                        ================================= */}

                        <div className="dashboard-card performance-card">

                            <div className="card-header">

                                <div>

                                    <p className="card-kicker">
                                        RESOURCE PERFORMANCE
                                    </p>

                                    <h2>
                                        Your Resources
                                    </h2>

                                    <p>
                                        See which resources are getting
                                        the most attention.
                                    </p>

                                </div>

                                {topResources.length > 0 && (
                                    <span className="chart-label">
                                        Top {topResources.length}
                                    </span>
                                )}

                            </div>


                            {loading ? (

                                <div className="dashboard-loading">
                                    Loading resources...
                                </div>

                            ) : topResources.length === 0 ? (

                                <div className="chart-empty">

                                    <div className="chart-empty-icon">
                                        ↑
                                    </div>

                                    <h3>
                                        No resources yet
                                    </h3>

                                    <p>
                                        Upload your first resource
                                        to see its performance here.
                                    </p>

                                    <Link to="/upload">
                                        Upload Resource →
                                    </Link>

                                </div>

                            ) : (

                                <div className="resource-chart">

                                    {topResources.map(
                                        (note) => {

                                            const downloads =
                                                Number(
                                                    note.downloads || 0
                                                );

                                            const width =
                                                downloads === 0
                                                    ? 4
                                                    : Math.max(
                                                        (downloads /
                                                            maxDownloads) *
                                                            100,
                                                        8
                                                    );

                                            return (

                                                <div
                                                    className="resource-chart-row"
                                                    key={note.id}
                                                >

                                                    <div className="resource-chart-info">

                                                        <span
                                                            className="resource-name"
                                                            title={note.title}
                                                        >
                                                            {note.title}
                                                        </span>

                                                        <strong>
                                                            {downloads}
                                                        </strong>

                                                    </div>


                                                    <div className="resource-chart-track">

                                                        <div
                                                            className="resource-chart-fill"
                                                            style={{
                                                                width:
                                                                    `${width}%`
                                                            }}
                                                        >
                                                        </div>

                                                    </div>

                                                    <span className="resource-chart-caption">
                                                        {downloads === 1
                                                            ? "download"
                                                            : "downloads"}
                                                    </span>

                                                </div>

                                            );
                                        }
                                    )}

                                </div>

                            )}

                        </div>


                        {/* =================================
                            STUDY SNAPSHOT
                        ================================= */}

                        <div className="dashboard-card snapshot-card">

                            <div className="card-header">

                                <div>

                                    <p className="card-kicker">
                                        YOUR SNAPSHOT
                                    </p>

                                    <h2>
                                        Study Overview
                                    </h2>

                                    <p>
                                        A quick look at your
                                        contribution.
                                    </p>

                                </div>

                            </div>


                            <div className="snapshot-list">


                                <div className="snapshot-item">

                                    <div>
                                        <span>
                                            Resources shared
                                        </span>

                                        <small>
                                            Total contributions
                                        </small>
                                    </div>

                                    <strong>
                                        {notes.length}
                                    </strong>

                                </div>


                                <div className="snapshot-item">

                                    <div>
                                        <span>
                                            Average downloads
                                        </span>

                                        <small>
                                            Per resource
                                        </small>
                                    </div>

                                    <strong>
                                        {averageDownloads}
                                    </strong>

                                </div>


                                <div className="snapshot-item">

                                    <div>
                                        <span>
                                            Saved resources
                                        </span>

                                        <small>
                                            Your personal collection
                                        </small>
                                    </div>

                                    <strong>
                                        {savedNotes.length}
                                    </strong>

                                </div>

                            </div>


                            {/* MOST DOWNLOADED */}

                            <div className="top-resource-box">

                                <span>
                                    MOST DOWNLOADED
                                </span>


                                {mostDownloaded ? (

                                    <>

                                        <strong
                                            title={
                                                mostDownloaded.title
                                            }
                                        >
                                            {mostDownloaded.title}
                                        </strong>

                                        <small>
                                            {Number(
                                                mostDownloaded.downloads || 0
                                            )} downloads
                                        </small>

                                    </>

                                ) : (

                                    <strong>
                                        No resources yet
                                    </strong>

                                )}

                            </div>

                        </div>

                    </section>


                    {/* =================================
                        RECENT ACTIVITY
                    ================================= */}

                    <section className="dashboard-card recent-card">

                        <div className="card-header">

                            <div>

                                <p className="card-kicker">
                                    ACTIVITY HISTORY
                                </p>

                                <h2>
                                    Recent Activity
                                </h2>

                                <p>
                                    Your latest actions on StudyHub.
                                </p>

                            </div>

                            {activities.length > 0 && (
                                <span className="activity-count">
                                    {activities.length} recent
                                </span>
                            )}

                        </div>


                        {activityLoading ? (

                            <div className="dashboard-loading">
                                Loading recent activity...
                            </div>

                        ) : activities.length === 0 ? (

                            <div className="empty-activity">

                                <div className="empty-activity-icon">
                                    ◷
                                </div>

                                <div>

                                    <h3>
                                        No recent activity
                                    </h3>

                                    <p>
                                        Your previews, downloads,
                                        saves and uploads will appear
                                        here.
                                    </p>

                                </div>

                            </div>

                        ) : (

                            <div className="activity-list">

                                {activities.map(
                                    (activity) => (

                                        <div
                                            className="activity-row"
                                            key={activity.id}
                                        >

                                            <div
                                                className={`activity-circle ${activity.activity_type}`}
                                            >
                                                {getActivityIcon(
                                                    activity.activity_type
                                                )}
                                            </div>


                                            <div className="activity-details">

                                                <p>
                                                    {getActivityText(
                                                        activity
                                                    )}
                                                </p>

                                                <span>
                                                    {getTimeAgo(
                                                        activity.created_at
                                                    )}
                                                </span>

                                            </div>


                                            <span
                                                className={`activity-badge ${activity.activity_type}`}
                                            >
                                                {activity.activity_type}
                                            </span>

                                        </div>

                                    )
                                )}

                            </div>

                        )}

                    </section>


                    {/* =================================
                        SMALL BOTTOM SECTION
                    ================================= */}

                    <section className="dashboard-bottom">


                        {/* CONTRIBUTION */}

                        <div className="dashboard-card contribution-card">

                            <div>

                                <p className="card-kicker">
                                    YOUR CONTRIBUTION
                                </p>

                                <h2>
                                    Keep Sharing Knowledge
                                </h2>

                                <p>
                                    Your resources help other students
                                    learn faster.
                                </p>

                            </div>


                            <div className="contribution-value">

                                <strong>
                                    {notes.length}
                                </strong>

                                <span>
                                    resources shared
                                </span>

                            </div>


                            <Link
                                to="/upload"
                                className="contribution-link"
                            >
                                Share another resource →
                            </Link>

                        </div>


                        {/* PROFILE */}

                        <div className="dashboard-card account-card">

                            <p className="card-kicker">
                                ACCOUNT
                            </p>

                            <h2>
                                Your Profile
                            </h2>


                            <div className="profile-box">

                                <div className="profile-avatar-large">
                                    {userInitial}
                                </div>


                                <div className="profile-info">

                                    <strong>
                                        {user.fullname}
                                    </strong>

                                    <span>
                                        {user.email}
                                    </span>

                                    <small>
                                        StudyHub Student
                                    </small>

                                </div>

                            </div>

                        </div>

                    </section>

                </div>

            </main>

        </div>
    );
}

export default Dashboard;