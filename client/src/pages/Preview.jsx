
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { renderAsync } from "docx-preview";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import "../styles/preview.css";
import API_URL from "../api";


const IMAGE_TYPES = [
    "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"
];

const OFFICE_TYPES = [
    "doc", "ppt", "xls"
];

function Preview() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [viewerError, setViewerError] = useState("");
    const [textContent, setTextContent] = useState("");
    const [slides, setSlides] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [sheets, setSheets] = useState([]);
    const [currentSheet, setCurrentSheet] = useState(0);
    const [sheetRows, setSheetRows] = useState([]);
    const [fileLoading, setFileLoading] = useState(false);
    // Reviews
const [reviews, setReviews] = useState([]);
const [rating, setRating] = useState(0);
const [comment, setComment] = useState("");
const [reviewsLoading, setReviewsLoading] = useState(false);
const [reviewSubmitting, setReviewSubmitting] = useState(false);
const [reviewMessage, setReviewMessage] = useState("");
const [reviewError, setReviewError] = useState("");

// AI Summary
const [summary, setSummary] = useState("");
const [summaryLoading, setSummaryLoading] = useState(false);
const [summaryError, setSummaryError] = useState("");

    const docxContainerRef = useRef(null);
    const summarySectionRef = useRef(null);
const reviewsSectionRef = useRef(null);

    // Declare the URL before any effect uses it.
    const fileUrl = `${API_URL}/api/notes/${id}/file`;

    const extension = note?.file_name
        ?.split(".")
        .pop()
        .toLowerCase();

    // Load note metadata.
    useEffect(() => {
        let cancelled = false;

        async function loadNote() {
            setLoading(true);
            setError("");
            setNote(null);

            try {
                const response = await fetch(`${API_URL}/api/notes`);

                if (!response.ok) {
                    throw new Error("Unable to load resources.");
                }

                const result = await response.json();

                const notes = Array.isArray(result)
                    ? result
                    : result.notes || result.data || [];

                const selectedNote = notes.find(
                    (item) =>
                        String(item.id || item._id) === String(id)
                );

                if (!selectedNote) {
                    throw new Error("Resource not found.");
                }

                if (!cancelled) {
                    setNote(selectedNote);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load resource.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadNote();

        return () => {
            cancelled = true;
        };
    }, [id]);

    // Render DOCX in the page.
    useEffect(() => {
        if (!note || extension !== "docx" || !docxContainerRef.current) {
            return;
        }

        let cancelled = false;

        async function renderDocx() {
            setFileLoading(true);
            setViewerError("");

            try {
                const response = await fetch(fileUrl);

                if (!response.ok) {
                    throw new Error("Could not retrieve the DOCX file.");
                }

                const buffer = await response.arrayBuffer();

                if (cancelled || !docxContainerRef.current) {
                    return;
                }

                docxContainerRef.current.innerHTML = "";

                await renderAsync(
                    buffer,
                    docxContainerRef.current
                );
            } catch (err) {
                console.error("DOCX preview error:", err);

                if (!cancelled) {
                    setViewerError(
                        "DOCX preview failed. Please download the file."
                    );
                }
            } finally {
                if (!cancelled) {
                    setFileLoading(false);
                }
            }
        }

        renderDocx();

        return () => {
            cancelled = true;
        };
    }, [note, extension, fileUrl]);

    // Read text files.
    useEffect(() => {
        if (!note || extension !== "txt") {
            return;
        }

        let cancelled = false;

        async function loadText() {
            setFileLoading(true);
            setViewerError("");

            try {
                const response = await fetch(fileUrl);

                if (!response.ok) {
                    throw new Error("Could not retrieve the text file.");
                }

                const text = await response.text();

                if (!cancelled) {
                    setTextContent(text);
                }
            } catch (err) {
                if (!cancelled) {
                    setViewerError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setFileLoading(false);
                }
            }
        }

        loadText();

        return () => {
            cancelled = true;
        };
    }, [note, extension, fileUrl]);

    // Extract text from PPTX slides.
    // This is a basic text viewer, not a full PowerPoint renderer.
    useEffect(() => {
        if (!note || extension !== "pptx") {
            return;
        }

        let cancelled = false;

        async function loadPptx() {
            setFileLoading(true);
            setViewerError("");
            setSlides([]);
            setCurrentSlide(0);

            try {
                const response = await fetch(fileUrl);

                if (!response.ok) {
                    throw new Error("Could not retrieve the PPTX file.");
                }

                const buffer = await response.arrayBuffer();
                const zip = await JSZip.loadAsync(buffer);

                const slidePaths = Object.keys(zip.files)
                    .filter((name) =>
                        /^ppt\/slides\/slide\d+\.xml$/.test(name)
                    )
                    .sort((a, b) => {
                        const numberA = Number(
                            a.match(/slide(\d+)\.xml$/)[1]
                        );
                        const numberB = Number(
                            b.match(/slide(\d+)\.xml$/)[1]
                        );
                        return numberA - numberB;
                    });

                const parsedSlides = [];

                for (const path of slidePaths) {
                    const xml = await zip.files[path].async("text");
                    const documentXml = new DOMParser().parseFromString(
                        xml,
                        "application/xml"
                    );

                    const paragraphs = Array.from(
                        documentXml.getElementsByTagName("a:p")
                    );

                    const lines = paragraphs
                        .map((paragraph) =>
                            Array.from(
                                paragraph.getElementsByTagName("a:t")
                            )
                                .map((node) => node.textContent || "")
                                .join("")
                        )
                        .filter((line) => line.trim());

                    parsedSlides.push(lines);
                }

                if (!parsedSlides.length) {
                    throw new Error("No readable slides were found.");
                }

                if (!cancelled) {
                    setSlides(parsedSlides);
                }
            } catch (err) {
                console.error("PPTX preview error:", err);

                if (!cancelled) {
                    setViewerError(
                        "Unable to read this PPTX. Try downloading it."
                    );
                }
            } finally {
                if (!cancelled) {
                    setFileLoading(false);
                }
            }
        }

        loadPptx();

        return () => {
            cancelled = true;
        };
    }, [note, extension, fileUrl]);

    // Read Excel workbooks.
    useEffect(() => {
        if (!note || !["xlsx", "xls"].includes(extension)) {
            return;
        }

        let cancelled = false;

        async function loadWorkbook() {
            setFileLoading(true);
            setViewerError("");
            setSheets([]);
            setSheetRows([]);

            try {
                const response = await fetch(fileUrl);

                if (!response.ok) {
                    throw new Error("Could not retrieve the spreadsheet.");
                }

                const buffer = await response.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: "array" });

                const parsedSheets = workbook.SheetNames.map((name) => ({
                    name,
                    rows: XLSX.utils.sheet_to_json(
                        workbook.Sheets[name],
                        {
                            header: 1,
                            defval: ""
                        }
                    )
                }));

                if (!cancelled) {
                    setSheets(parsedSheets);

                    if (parsedSheets.length) {
                        setCurrentSheet(0);
                        setSheetRows(parsedSheets[0].rows);
                    }
                }
            } catch (err) {
                console.error("Spreadsheet preview error:", err);

                if (!cancelled) {
                    setViewerError(
                        "Unable to preview this spreadsheet."
                    );
                }
            } finally {
                if (!cancelled) {
                    setFileLoading(false);
                }
            }
        }

        loadWorkbook();

        return () => {
            cancelled = true;
        };
    }, [note, extension, fileUrl]);

    function selectSheet(index) {
        setCurrentSheet(index);
        setSheetRows(sheets[index]?.rows || []);
    }
    function getCurrentUserId() {
    try {
        const storedUser =
            localStorage.getItem("studyhub_user") ||
            localStorage.getItem("user");

        if (!storedUser) return null;

        const user = JSON.parse(storedUser);
        return user.id || user._id || null;
    } catch {
        return null;
    }
}

// Load all reviews for this resource
useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
        setReviewsLoading(true);
        setReviewError("");

        try {
            const response = await fetch(
                `${API_URL}/api/notes/${id}/reviews`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load reviews."
                );
            }

            if (!cancelled) {
                setReviews(Array.isArray(data) ? data : []);

                const userId = getCurrentUserId();

                const myReview = Array.isArray(data)
                    ? data.find(
                          (review) =>
                              String(review.user_id) === String(userId)
                      )
                    : null;

                if (myReview) {
                    setRating(myReview.rating);
                    setComment(myReview.comment || "");
                } else {
                    setRating(0);
                    setComment("");
                }
            }
        } catch (err) {
            if (!cancelled) {
                setReviewError(
                    err.message || "Failed to load reviews."
                );
            }
        } finally {
            if (!cancelled) {
                setReviewsLoading(false);
            }
        }
    }

    loadReviews();

    return () => {
        cancelled = true;
    };
}, [id]);

// Submit a new review or update the existing review
async function handleSubmitReview() {
    const userId = getCurrentUserId();

    if (!userId) {
        navigate("/login");
        return;
    }

    if (rating < 1 || rating > 5) {
        setReviewError("Please select a rating from 1 to 5 stars.");
        return;
    }

    setReviewSubmitting(true);
    setReviewError("");
    setReviewMessage("");

    try {
        const response = await fetch(
            `${API_URL}/api/notes/${id}/reviews`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_id: userId,
                    rating,
                    comment,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to submit review."
            );
        }

        setReviewMessage("Your review has been saved!");

        // Refresh reviews after submission
        const reviewsResponse = await fetch(
            `${API_URL}/api/notes/${id}/reviews`
        );

        const updatedReviews = await reviewsResponse.json();

        if (!reviewsResponse.ok) {
            throw new Error(
                updatedReviews.message || "Review saved, but refresh failed."
            );
        }

        setReviews(
            Array.isArray(updatedReviews) ? updatedReviews : []
        );
    } catch (err) {
        setReviewError(
            err.message || "Something went wrong while saving your review."
        );
    } finally {
        setReviewSubmitting(false);
    }
}

// Generate AI Summary for PDF files
async function handleGenerateSummary() {
    const userId = getCurrentUserId();

    if (!userId) {
        navigate("/login");
        return;
    }

    setSummaryLoading(true);
    setSummaryError("");
    setSummary("");

    try {
        const response = await fetch(
            `${API_URL}/api/notes/${id}/summarize`,
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

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to generate AI Summary."
            );
        }

        setSummary(data.summary || "");

// Wait for the summary section to render, then scroll to it.
requestAnimationFrame(() => {
    summarySectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
});
    } catch (err) {
        setSummaryError(
            err.message || "Failed to generate AI Summary."
        );
    } finally {
        setSummaryLoading(false);
    }
}

    function handleDownload() {
        const storedUser =
            localStorage.getItem("studyhub_user") ||
            localStorage.getItem("user");

        if (!storedUser) {
            navigate("/login");
            return;
        }

        try {
            const user = JSON.parse(storedUser);
            const userId = user.id || user._id;

            if (!userId) {
                navigate("/login");
                return;
            }

            window.location.href =
                `${API_URL}/api/notes/${id}/download` +
                `?user_id=${encodeURIComponent(userId)}`;
        } catch {
            navigate("/login");
        }
    }

    if (loading) {
        return (
            <main className="preview-page">
                <p>Loading resource...</p>
            </main>
        );
    }

    if (error || !note) {
        return (
            <main className="preview-page">
                <button
                    className="preview-back"
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>

                <p className="preview-error">
                    {error || "Resource not found."}
                </p>
            </main>
        );
    }

    return (
        <main className="preview-page">
            <header className="preview-header">
                <button
                    className="preview-back"
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>

                <div className="preview-heading">
                    <h1>{note.title}</h1>
                    <p>
                        {note.subject} · {note.semester}
                    </p>
                    <small>{note.file_name}</small>
                </div>

                <button
                    className="preview-download"
                    onClick={handleDownload}
                >
                    Download
                </button>
              {["pdf", "docx", "pptx"].includes(extension) && (
    <button
        className="preview-ai-button"
        onClick={handleGenerateSummary}
        disabled={summaryLoading}
    >
        {summaryLoading ? "Generating..." : "✨ AI Summary"}
    </button>
)}

<button
    className="preview-comments-button"
    onClick={() =>
        reviewsSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        })
    }
>
    💬 Comments & Reviews
</button>
            </header>

            <section className="preview-viewer">
                {fileLoading && (
                    <p className="preview-status">
                        Loading file preview...
                    </p>
                )}

                {viewerError && (
                    <div className="preview-office-message">
                        <h2>Preview unavailable</h2>
                        <p>{viewerError}</p>
                        <button onClick={handleDownload}>
                            Download File
                        </button>
                    </div>
                )}

                {!viewerError && extension === "pdf" && (
                    <iframe
                        title={note.title}
                        src={fileUrl}
                        className="preview-frame"
                    />
                )}

                {!viewerError && IMAGE_TYPES.includes(extension) && (
                    <img
                        src={fileUrl}
                        alt={note.title}
                        className="preview-image"
                    />
                )}

                {!viewerError && extension === "txt" && (
                    <pre className="preview-text">
                        {textContent}
                    </pre>
                )}

                {!viewerError && extension === "docx" && (
                    <div
                        ref={docxContainerRef}
                        className="docx-preview-container"
                    />
                )}

                {!viewerError && extension === "pptx" && slides.length > 0 && (
                    <div className="pptx-viewer">
                        <div className="pptx-slide">
                            <span className="pptx-slide-label">
                                Slide {currentSlide + 1} of {slides.length}
                            </span>

                            {slides[currentSlide].length ? (
                                slides[currentSlide].map((line, index) => (
                                    <p key={`${currentSlide}-${index}`}>
                                        {line}
                                    </p>
                                ))
                            ) : (
                                <p>This slide has no readable text.</p>
                            )}
                        </div>

                        <div className="pptx-controls">
                            <button
                                disabled={currentSlide === 0}
                                onClick={() =>
                                    setCurrentSlide((value) => value - 1)
                                }
                            >
                                Previous
                            </button>

                            <span>
                                {currentSlide + 1} / {slides.length}
                            </span>

                            <button
                                disabled={currentSlide >= slides.length - 1}
                                onClick={() =>
                                    setCurrentSlide((value) => value + 1)
                                }
                            >
                                Next
                            </button>
                        </div>

                        <p className="preview-note">
                            Basic text preview: original slide formatting,
                            images, animations and charts may not appear.
                        </p>
                    </div>
                )}

                {!viewerError &&
                    ["xlsx", "xls"].includes(extension) &&
                    sheets.length > 0 && (
                        <div className="spreadsheet-viewer">
                            <label htmlFor="sheet-select">
                                Worksheet:
                            </label>

                            <select
                                id="sheet-select"
                                value={currentSheet}
                                onChange={(event) =>
                                    selectSheet(Number(event.target.value))
                                }
                            >
                                {sheets.map((sheet, index) => (
                                    <option key={sheet.name} value={index}>
                                        {sheet.name}
                                    </option>
                                ))}
                            </select>

                            <div className="spreadsheet-table-wrap">
                                <table className="spreadsheet-table">
                                    <tbody>
                                        {sheetRows.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                {row.map((cell, cellIndex) => {
                                                    const Cell =
                                                        rowIndex === 0
                                                            ? "th"
                                                            : "td";

                                                    return (
                                                        <Cell key={cellIndex}>
                                                            {String(cell)}
                                                        </Cell>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                {!viewerError && OFFICE_TYPES.includes(extension) && (
                    <div className="preview-office-message">
                        <h2>Legacy Office document</h2>
                        <p>
                            This older Office format needs conversion
                            before it can be previewed here.
                        </p>
                        <button onClick={handleDownload}>
                            Download File
                        </button>
                    </div>
                )}

                {!viewerError &&
                    ![
                        "pdf", "txt", ...IMAGE_TYPES,
                        "docx", "pptx", "xlsx", "xls",
                        ...OFFICE_TYPES
                    ].includes(extension) && (
                        <div className="preview-office-message">
                            <h2>Preview unavailable</h2>
                            <p>
                                This file type is not supported yet.
                            </p>
                            <button onClick={handleDownload}>
                                Download File
                            </button>
                        </div>
                    )}
            </section>
            {/* AI SUMMARY */}
{(summary || summaryLoading || summaryError) && (
    <section
        className="preview-feature-section"
        ref={summarySectionRef}
        id="ai-summary-section"
    >
        <h2>✨ AI Study Summary</h2>

        {summaryLoading && (
            <p className="preview-status">
                Generating your exam-oriented summary...
                This may take a little time.
            </p>
        )}

        {summaryError && (
            <p className="preview-error">{summaryError}</p>
        )}

        {summary && (
            <div className="preview-summary-content">
                <pre>{summary}</pre>
            </div>
        )}
    </section>
)}

{/* RATINGS AND COMMENTS */}
<section
    className="preview-feature-section"
    ref={reviewsSectionRef}
    id="reviews-section"
>
    <h2>⭐ Ratings & Reviews</h2>

    <p className="preview-review-subtitle">
        Share your feedback to help other students.
    </p>

    <div className="preview-review-form">
        <h3>
            {reviews.some(
                (review) =>
                    String(review.user_id) ===
                    String(getCurrentUserId())
            )
                ? "Update Your Review"
                : "Write a Review"}
        </h3>

        <label className="preview-field-label">
            Your Rating
        </label>

        <div className="preview-star-picker">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    className={`preview-star ${
                        star <= rating ? "selected" : ""
                    }`}
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} out of 5`}
                    aria-pressed={rating === star}
                >
                    ★
                </button>
            ))}
        </div>

        <label
            htmlFor="preview-review-comment"
            className="preview-field-label"
        >
            Your Comment
        </label>

        <textarea
            id="preview-review-comment"
            className="preview-comment-input"
            placeholder="Was this resource useful? Share your thoughts..."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            rows={4}
        />

        <p className="preview-character-count">
            {comment.length}/2000 characters
        </p>

        {reviewError && (
            <p className="preview-error">{reviewError}</p>
        )}

        {reviewMessage && (
            <p className="preview-success">{reviewMessage}</p>
        )}

        <button
            type="button"
            className="preview-submit-review"
            onClick={handleSubmitReview}
            disabled={reviewSubmitting || reviewsLoading}
        >
            {reviewSubmitting
                ? "Submitting..."
                : "Submit Review"}
        </button>
    </div>

    <div className="preview-reviews-list">
        <h3>
            Student Reviews ({reviews.length})
        </h3>

        {reviewsLoading && <p>Loading reviews...</p>}

        {!reviewsLoading && reviews.length === 0 && (
            <p className="preview-empty-reviews">
                No reviews yet. Be the first to review this resource!
            </p>
        )}

        {reviews.map((review) => (
            <article
                className="preview-review-card"
                key={review.id}
            >
                <div className="preview-review-top">
                    <strong>{review.fullname}</strong>

                    <span className="preview-review-stars">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                    </span>
                </div>

                {review.comment && (
                    <p className="preview-review-comment">
                        {review.comment}
                    </p>
                )}

                {review.createdAt && (
                    <small>
                        {new Date(
                            review.createdAt
                        ).toLocaleDateString()}
                    </small>
                )}
            </article>
        ))}
    </div>
</section>
        </main>
    );
}

export default Preview;
