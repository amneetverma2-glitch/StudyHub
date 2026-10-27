import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/home.css";
import DocumentThumbnail from "../components/DocumentThumbnail";

function Home() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/notes")
      .then((response) => response.json())
      .then((data) => {
        setNotes(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching notes:", error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="home-page">

      {/* =========================
          NAVBAR
      ========================== */}

      <nav className="navbar">


       
<div className="logo">
  <img src="/images/logo.png" alt="StudyHub Logo" />
  <span className="logo-text">
    Study<span>Hub</span>
  </span>
</div>



        <div className="nav-links">

          <a href="#community">
            Community
          </a>

          <a href="#how-it-works">
            How It Works
          </a>

          <a href="#resources">
            Resources
          </a>

          <a href="#about">
            About
          </a>

        </div>


        <div className="nav-actions">

          <Link
            to="/login"
            className="login-btn"
          >
            Log in
          </Link>

          <Link
            to="/register"
            className="get-started-btn"
          >
            Get Started
          </Link>

        </div>

      </nav>


      {/* =========================
          HERO SECTION
      ========================== */}

      <section className="hero-section">

        <div className="hero-content">

          <p className="hero-small-title">
            STUDENT-POWERED LEARNING PLATFORM
          </p>


          <h1>
            Master Your Courses with
            <span> Student-Powered Resources.</span>
          </h1>


          <p className="hero-description">
            Access a vast library of lecture notes, study guides,
            and practice materials contributed by students.
            Learn, share, and grow together.
          </p>


          <div className="hero-buttons">

            <Link
              to="/register"
              className="primary-btn"
            >
              Get Started →
            </Link>


            <Link
              to="/login"
              className="secondary-btn"
            >
              Log in to StudyHub
            </Link>

          </div>

        </div>


        <div className="hero-image">

    <div className="image-card">

        <img
            src="/images/a1.png"
            alt="Students studying"
        />

        <div className="image-card-content">

            <p>
                StudyHub Resources
            </p>

            <h3>
                Student Contributed Notes
            </h3>

            <span>
                Access notes shared by students
            </span>

        </div>

    </div>

</div>

      </section>


      {/* =========================
          RESOURCES SECTION
      ========================== */}

      <section
        id="resources"
        className="resources-section"
      >

        <div className="section-heading">

          <div>

            <h2>
              Most Downloaded Resources
            </h2>

            <p>
              Popular study materials shared by students.
            </p>

          </div>


          <Link to="/login">
            Login to explore →
          </Link>

        </div>


        <div className="resource-grid">

          {loading ? (

            <p className="loading-text">
              Loading resources...
            </p>

          ) : notes.length === 0 ? (

            <p className="empty-text">
              No resources available yet.
            </p>

          ) : (

            notes
              .slice()
              .sort(
                (a, b) =>
                  Number(b.downloads || 0) -
                  Number(a.downloads || 0)
              )
              .slice(0, 3)
              .map((note) => (

                <div
                  className="resource-card"
                  key={note.id}
                >

                  {/* Resource Preview */}

                 
{/* Resource Preview */}
<div className="resource-image">
  <DocumentThumbnail
    note={note}
    fallback={
      <div className="document-preview">
        <div className="document-top">
          <span>
            {note.file_name
              ?.split(".")
              .pop()
              ?.toUpperCase() || "FILE"}
          </span>
        </div>

        <div className="document-lines">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className="document-icon">📄</div>
      </div>
    }
  />
</div>



                  {/* Subject */}

                  <p>
                    {note.subject}
                  </p>


                  {/* Title */}

                  <h3>
                    {note.title}
                  </h3>


                  {/* Semester + Rating */}

                  <div className="resource-meta">

                    <span>
                      Semester: {note.semester}
                    </span>


                    <span className="rating">

                      {note.total_reviews > 0
                        ? `⭐ ${note.avg_rating} (${note.total_reviews})`
                        : "☆ No ratings yet"}

                    </span>

                  </div>


                  {/* Uploader + Downloads */}

                  <div className="resource-details">

                    <span>
                      👤 {note.uploader_name || "Unknown"}
                    </span>


                    <span>
                      ↓ {note.downloads || 0} Downloads
                    </span>

                  </div>


                  {/* Upload Date */}

                  <div className="resource-date">

                    Uploaded:{" "}

                    {note.upload_date
                      ? new Date(
                          note.upload_date
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          }
                        )
                      : "Unknown"}

                  </div>


                  {/* Login Required */}

                  <Link
                    to="/login"
                    className="preview-btn"
                  >
                    Preview
                  </Link>


                  <Link
                    to="/login"
                    className="download-btn"
                  >
                    ↓ Download
                  </Link>

                </div>

              ))

          )}

        </div>

      </section>


      {/* =========================
          HOW IT WORKS
      ========================== */}

      <section
        id="how-it-works"
        className="how-section"
      >

        <div className="section-title">

          <h2>
            How StudyHub Works
          </h2>

          <p>
            Learn, contribute, and help other students succeed.
          </p>

        </div>


        <div className="steps">

          {/* Step 1 */}

          <div className="step">

            <div className="step-number">
              1
            </div>


            <h3>
              Find Your Courses
            </h3>


            <p>
              Search for university-specific courses
              and discover useful study materials.
            </p>

          </div>


          {/* Step 2 */}

          <div className="step">

            <div className="step-number">
              2
            </div>


            <h3>
              Access & Learn
            </h3>


            <p>
              Access notes and study resources
              shared by students.
            </p>

          </div>


          {/* Step 3 */}

          <div className="step">

            <div className="step-number">
              3
            </div>


            <h3>
              Pay It Forward
            </h3>


            <p>
              Upload useful resources and
              help other students.
            </p>

          </div>

        </div>

      </section>


      {/* =========================
          COMMUNITY SECTION
      ========================== */}

      <section
        id="community"
        className="reviews-section"
      >

        <div className="section-title">

          <h2>
            Student Community
          </h2>


          <p>
            Learn, share knowledge, and grow together
            with fellow students.
          </p>

        </div>


        <div className="review-grid">

          <div className="review-card">

            <p>
              StudyHub brings students together to
              share useful academic resources,
              exchange knowledge, and support each
              other's learning journey.
            </p>


            <Link to="/register">
              Join the Community →
            </Link>

          </div>

        </div>

      </section>


      {/* =========================
          ABOUT SECTION
      ========================== */}

      <section
        id="about"
        className="how-section"
      >

        <div className="section-title">

          <h2>
            About StudyHub
          </h2>


          <p>
            A student-powered platform for sharing
            and discovering academic resources.
          </p>

        </div>


        <div className="steps">

          {/* Learn */}

          <div className="step">

            <div className="step-number">
              📚
            </div>


            <h3>
              Learn
            </h3>


            <p>
              Discover notes, study guides, and
              academic resources shared by students.
            </p>

          </div>


          {/* Share */}

          <div className="step">

            <div className="step-number">
              🤝
            </div>


            <h3>
              Share
            </h3>


            <p>
              Contribute useful study material
              and help other students.
            </p>

          </div>


          {/* Grow */}

          <div className="step">

            <div className="step-number">
              🎓
            </div>


            <h3>
              Grow
            </h3>


            <p>
              Build a collaborative academic
              community through shared knowledge.
            </p>

          </div>

        </div>

      </section>


      {/* =========================
          FOOTER
      ========================== */}

      <footer className="footer">

        {/* Brand */}

        <div className="footer-brand">

          <h2>
            Study<span>Hub</span>
          </h2>


          <p>
            Empowering academic collaboration
            through shared knowledge.
          </p>


          <small>
            © 2026 StudyHub. All rights reserved.
          </small>

        </div>


        {/* Resources */}

        <div className="footer-column">

          <h4>
            Resources
          </h4>


          <Link to="/login">
            Explore Materials
          </Link>


          <a href="#resources">
            Popular Resources
          </a>


          <a href="#how-it-works">
            How It Works
          </a>

        </div>


        {/* Company */}

        <div className="footer-column">

          <h4>
            Company
          </h4>


          <a href="#about">
            About Us
          </a>


          <a href="#community">
            Community
          </a>


          <a href="#">
            Contact Support
          </a>

        </div>


        {/* Legal */}

        <div className="footer-column">

          <h4>
            Legal
          </h4>


          <a href="#">
            Privacy Policy
          </a>


          <a href="#">
            Terms of Service
          </a>

        </div>

      </footer>

    </div>
  );
}

export default Home;