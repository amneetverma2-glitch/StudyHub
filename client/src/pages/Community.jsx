
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import "../styles/Community.css";
import API_URL from "../api";

const API = `${API_URL}/api/community`;

const topics = [
  "All Topics",
  "Programming",
  "Web Development",
  "Data Science",
  "Java",
  "DBMS",
];

function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("studyhub_user") ||
      localStorage.getItem("user") ||
      "null"
    );
  } catch {
    return null;
  }
}

function getUserName(user) {
  return user?.fullname || user?.name || "Student";
}

function getUserId(user) {
  return String(user?._id || user?.id || "");
}

function getAuthorName(author) {
  if (typeof author === "object" && author !== null) {
    return author.fullname || author.name || "Student";
  }
  return "Student";
}

function formatDate(date) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString();
}

function Community() {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("Programming");
  const [filter, setFilter] = useState("All Questions");
  const [activeTopic, setActiveTopic] = useState("All Topics");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [answerText, setAnswerText] = useState({});
  const [openAnswers, setOpenAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const currentUser = getStoredUser();
  const userName = getUserName(currentUser);
  const currentUserId = getUserId(currentUser);
  const token = localStorage.getItem("studyhub_token");

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("studyhub_token") || ""}`,
  });

  const handleLogout = () => {
    localStorage.removeItem("studyhub_token");
    localStorage.removeItem("studyhub_user");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (activeTopic !== "All Topics") {
        params.set("topic", activeTopic);
      }

      const response = await fetch(
        `${API}/questions?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load questions.");
      }

      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        `${err.message}. Please check your internet connection and try again.`
      );
    } finally {
      setLoading(false);
    }
  }, [search, activeTopic]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const publishQuestion = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) return;

    if (!token) {
      setError("Please log in to publish a question.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/questions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          topic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not publish question.");
      }

      setTitle("");
      setDescription("");
      setShowForm(false);
      setFilter("All Questions");
      setActiveTopic("All Topics");
      setSearch("");
      setNotice("Your question has been published!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const publishAnswer = async (e, questionId) => {
    e.preventDefault();

    const text = answerText[questionId]?.trim();

    if (!text) return;

    if (!token) {
      setError("Please log in to post an answer.");
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API}/questions/${questionId}/answers`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ text }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not post answer.");
      }

      setAnswerText((prev) => ({
        ...prev,
        [questionId]: "",
      }));

      setOpenAnswers((prev) => ({
        ...prev,
        [questionId]: true,
      }));

      setQuestions((prev) =>
        prev.map((question) =>
          question._id === questionId ? data : question
        )
      );

      setNotice("Your answer has been posted!");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleUpvote = async (questionId) => {
    if (!token) {
      setError("Please log in to upvote a question.");
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `${API}/questions/${questionId}/upvote`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update upvote.");
      }

      setQuestions((prev) =>
        prev.map((question) => {
          if (question._id !== questionId) return question;

          const existing = Array.isArray(question.upvotes)
            ? question.upvotes
            : [];

          const updated = data.upvoted
            ? [...existing, currentUserId]
            : existing.filter(
                (id) => String(id?._id || id) !== currentUserId
              );

          return { ...question, upvotes: updated };
        })
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleFollow = async (questionId) => {
    if (!token) {
      setError("Please log in to follow a question.");
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `${API}/questions/${questionId}/follow`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update follow status.");
      }

      setQuestions((prev) =>
        prev.map((question) => {
          if (question._id !== questionId) return question;

          const existing = Array.isArray(question.followers)
            ? question.followers
            : [];

          const updated = data.following
            ? [...existing, currentUserId]
            : existing.filter(
                (id) => String(id?._id || id) !== currentUserId
              );

          return { ...question, followers: updated };
        })
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const visibleQuestions = questions.filter((question) => {
    const authorId =
      typeof question.author === "object"
        ? String(question.author?._id || "")
        : "";

    const isMyQuestion =
      authorId && currentUserId && authorId === currentUserId;

    const isFollowing = (question.followers || []).some(
      (id) => String(id?._id || id) === currentUserId
    );

    if (filter === "My Questions" && !isMyQuestion) return false;
    if (filter === "Following" && !isFollowing) return false;

    return true;
  });

  return (
    <div className="dashboard-page community-dashboard">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <h2>
            Study<span>Hub</span>
          </h2>
          <p>Academic Center</p>
        </div>

        <Link to="/upload" className="sidebar-upload-btn">
          + Upload Resource
        </Link>

        <nav className="sidebar-menu">
          <Link to="/dashboard" className="sidebar-link">
            <span>▦</span> Overview
          </Link>

          <Link to="/my-notes" className="sidebar-link">
            <span>▤</span> My Notes
          </Link>

          <Link to="/explore" className="sidebar-link">
            <span>⌕</span> Explore
          </Link>

          <Link to="/saved-notes" className="sidebar-link">
            <span>♡</span> Saved Notes
          </Link>

          <Link to="/community" className="sidebar-link active">
            <span>♧</span> Community
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <Link to="/settings" className="sidebar-link">
            <span>⚙</span> Settings
          </Link>

          <button
            type="button"
            className="sidebar-link logout-link"
            onClick={handleLogout}
          >
            <span>↪</span> Log out
          </button>
        </div>
      </aside>

      <main className="dashboard-main community-dashboard-main">
        <div className="community-page">
          <header className="community-topbar">
            <div className="community-brand">
              <span className="community-brand-icon">S</span>
              <span>
                StudyHub <b>Community</b>
              </span>
            </div>

            <div className="community-search">
              <span>⌕</span>
              <input
                aria-label="Search questions"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="community-ask-top"
              onClick={() => setShowForm((value) => !value)}
            >
              + Ask Question
            </button>
          </header>

          <div className="community-content">
            <section className="community-welcome">
              <span className="community-kicker">
                THE STUDENT KNOWLEDGE SPACE
              </span>

              <h1>
                Curious minds, <span>better answers.</span>
              </h1>

              <p>
                Ask questions, exchange ideas, and learn from students like you.
              </p>

              <button
                type="button"
                onClick={() => setShowForm((value) => !value)}
              >
                + Ask the community
              </button>
            </section>

            {error && (
              <div className="community-message community-error" role="alert">
                {error}
              </div>
            )}

            {notice && (
              <div className="community-message community-success" role="status">
                {notice}
              </div>
            )}

            {showForm && (
              <form
                className="community-question-form"
                onSubmit={publishQuestion}
              >
                <div className="community-form-heading">
                  <div>
                    <span className="community-kicker">NEW DISCUSSION</span>
                    <h2>Ask the community</h2>
                  </div>

                  <button
                    type="button"
                    className="community-close"
                    onClick={() => setShowForm(false)}
                    aria-label="Close form"
                  >
                    ×
                  </button>
                </div>

                <label htmlFor="question-title">Question title</label>
                <input
                  id="question-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What would you like to know?"
                  maxLength={180}
                  required
                />

                <label htmlFor="question-description">Question details</label>
                <textarea
                  id="question-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details to help others understand your question..."
                  rows={4}
                  maxLength={5000}
                  required
                />

                <label htmlFor="question-topic">Topic</label>
                <select
                  id="question-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  {topics
                    .filter((item) => item !== "All Topics")
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </select>

                <div className="community-form-actions">
                  <button
                    type="button"
                    className="community-cancel"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="community-submit"
                    disabled={submitting}
                  >
                    {submitting ? "Publishing..." : "Publish Question"}
                  </button>
                </div>
              </form>
            )}

            <div className="community-columns">
              <section className="community-feed">
                <div className="community-feed-toolbar">
                  <div>
                    <h2>
                      {filter === "My Questions"
                        ? "My Questions"
                        : filter === "Following"
                        ? "Following"
                        : "Community Questions"}
                    </h2>
                    <p>Explore questions. Share what you know.</p>
                  </div>

                  <span className="community-question-count">
                    {visibleQuestions.length}
                  </span>
                </div>

                <div className="community-filter-bar">
                  {["All Questions", "Following", "My Questions"].map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        className={filter === item ? "selected" : ""}
                        onClick={() => setFilter(item)}
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>

                <div className="community-filter-bar">
                  {topics.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={activeTopic === item ? "selected" : ""}
                      onClick={() => setActiveTopic(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="community-empty">
                    <h3>Loading community questions...</h3>
                    <p>Please wait while we fetch the latest discussions.</p>
                  </div>
                ) : visibleQuestions.length === 0 ? (
                  <div className="community-empty">
                    <div className="community-empty-symbol">?</div>

                    <h3>
                      {error
                        ? "Questions couldn't be loaded"
                        : search
                        ? "No matching questions"
                        : filter === "My Questions"
                        ? "You haven't asked a question yet"
                        : filter === "Following"
                        ? "No followed questions yet"
                        : "Start the conversation"}
                    </h3>

                    <p>
                      {error
                        ? "Check your backend and try refreshing."
                        : "Ask your first question and help build the StudyHub community."}
                    </p>

                    {!error && filter !== "Following" && (
                      <button
                        type="button"
                        onClick={() => setShowForm(true)}
                      >
                        Ask a Question
                      </button>
                    )}

                    {error && (
                      <button type="button" onClick={loadQuestions}>
                        Try Again
                      </button>
                    )}
                  </div>
                ) : (
                  visibleQuestions.map((question) => {
                    const questionId = question._id;
                    const authorName = getAuthorName(question.author);

                    const hasUpvoted = (question.upvotes || []).some(
                      (id) => String(id?._id || id) === currentUserId
                    );

                    const isFollowing = (question.followers || []).some(
                      (id) => String(id?._id || id) === currentUserId
                    );

                    const answers = question.answers || [];

                    return (
                      <article
                        className="community-question-card"
                        key={questionId}
                      >
                        <div className="community-question-meta">
                          <div className="community-user-avatar">
                            {authorName.charAt(0).toUpperCase()}
                          </div>

                          <div className="community-author-info">
                            <strong>{authorName}</strong>
                            <span>
                              Asked {formatDate(question.createdAt)}
                            </span>
                          </div>

                          <span className="community-question-topic">
                            {question.topic}
                          </span>
                        </div>

                        <h3 className="community-question-title">
                          {question.title}
                        </h3>

                        <p className="community-question-description">
                          {question.description}
                        </p>

                        <div className="community-question-actions">
                          <button
                            type="button"
                            className={`community-vote ${hasUpvoted ? "voted" : ""}`}
                            onClick={() => toggleUpvote(questionId)}
                          >
                            ↑ Upvote · {question.upvotes?.length || 0}
                          </button>

                          <button
                            type="button"
                            className="community-answer-toggle"
                            onClick={() =>
                              setOpenAnswers((prev) => ({
                                ...prev,
                                [questionId]: !prev[questionId],
                              }))
                            }
                          >
                            ▤ {answers.length} Answers
                          </button>

                          <button
                            type="button"
                            className={`community-follow ${isFollowing ? "is-following" : ""}`}
                            onClick={() => toggleFollow(questionId)}
                          >
                            {isFollowing ? "✓ Following" : "+ Follow"}
                          </button>
                        </div>

                        {openAnswers[questionId] && (
                          <div className="community-answers">
                            <h4>Answers ({answers.length})</h4>

                            {answers.length === 0 ? (
                              <p className="community-no-answers">
                                No answers yet. Be the first to help!
                              </p>
                            ) : (
                              answers.map((answer) => {
                                const answerAuthor = getAuthorName(answer.author);

                                return (
                                  <div
                                    className="community-answer"
                                    key={answer._id}
                                  >
                                    <div className="community-answer-author">
                                      <div className="community-user-avatar small">
                                        {answerAuthor.charAt(0).toUpperCase()}
                                      </div>

                                      <div>
                                        <strong>{answerAuthor}</strong>
                                        <span>
                                          {formatDate(answer.createdAt)}
                                        </span>
                                      </div>
                                    </div>

                                    <p>{answer.text}</p>
                                  </div>
                                );
                              })
                            )}

                            <form
                              className="community-answer-form"
                              onSubmit={(e) => publishAnswer(e, questionId)}
                            >
                              <textarea
                                value={answerText[questionId] || ""}
                                onChange={(e) =>
                                  setAnswerText((prev) => ({
                                    ...prev,
                                    [questionId]: e.target.value,
                                  }))
                                }
                                placeholder="Write a helpful answer..."
                                rows={3}
                                maxLength={3000}
                                required
                              />

                              <button
                                type="submit"
                                className="community-submit"
                              >
                                Post Answer
                              </button>
                            </form>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}

                <p className="community-local-notice">
                  Questions, answers, upvotes and follows are saved through
                  the StudyHub backend.
                </p>
              </section>

              <aside className="community-rightbar">
                <div className="community-right-card">
                  <h3>Explore Topics</h3>
                  <p className="community-right-subtitle">
                    Find your next discussion
                  </p>

                  {topics.map((item, index) => (
                    <button
                      type="button"
                      className={`community-popular-topic ${
                        activeTopic === item ? "selected" : ""
                      }`}
                      key={item}
                      onClick={() => setActiveTopic(item)}
                    >
                      <span className="community-popular-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{item}</span>
                      <span className="community-topic-arrow">↗</span>
                    </button>
                  ))}
                </div>

                <div className="community-right-card community-about-card">
                  <span className="community-kicker">ABOUT STUDYHUB</span>
                  <h3>Knowledge grows when it is shared.</h3>
                  <p>
                    Ask questions, explain concepts, and help fellow students
                    learn.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Community;
