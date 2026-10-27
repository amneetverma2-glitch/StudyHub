import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/upload.css";
import API_URL from "../api";
function Upload() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: "",
        subject: "",
        semester: "",
        description: ""
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleChange = (event) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        });
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];

        if (selectedFile) {
            setFile(selectedFile);
            setError("");
        }
    };

    const handleSubmit = async (event) => {

        event.preventDefault();

        setMessage("");
        setError("");

        const user = localStorage.getItem("studyhub_user");

        if (!user) {
            navigate("/login");
            return;
        }

        const loggedInUser = JSON.parse(user);

       if (
    !formData.title.trim() ||
    !formData.subject.trim() ||
    !file
) {
    setError("Please enter a resource title, subject, and select a file.");
    return;
}

        const uploadData = new FormData();

        uploadData.append("user_id", loggedInUser.id);
        uploadData.append("title", formData.title);
        uploadData.append("subject", formData.subject);
        uploadData.append("semester", formData.semester);
        uploadData.append("description", formData.description);
        uploadData.append("file", file);

        setLoading(true);

        try {

            const response = await fetch(
                `${API_URL}/api/notes/upload`,
                {
                    method: "POST",
                    body: uploadData
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Upload failed.");
                setLoading(false);
                return;
            }

            setMessage("Resource uploaded successfully!");

            setFormData({
                title: "",
                subject: "",
                semester: "",
                description: ""
            });

            setFile(null);

            document.getElementById("file-input").value = "";

            setTimeout(() => {
                navigate("/dashboard");
            }, 1000);

        } catch (error) {

            console.error("Upload error:", error);

            setError(
                "Unable to connect to the server."
            );

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-page">

            <div className="upload-container">

                {/* Header */}

                <div className="upload-header">

                    <Link
                        to="/dashboard"
                        className="upload-back"
                    >
                        ← Back to Dashboard
                    </Link>

                    <div className="upload-brand">
                        Study<span>Hub</span>
                    </div>

                </div>


                {/* Form */}

                <div className="upload-card">

                    <div className="upload-title">

                        <p>
                            SHARE KNOWLEDGE
                        </p>

                        <h1>
                            Upload Study Material
                        </h1>

                        <span>
                            Share useful resources with students on StudyHub.
                        </span>

                    </div>


                    {error && (
                        <div className="upload-error">
                            {error}
                        </div>
                    )}


                    {message && (
                        <div className="upload-success">
                            {message}
                        </div>
                    )}


                    <form onSubmit={handleSubmit}>

                        <div className="upload-row">

                            <div className="upload-field">

                                <label>
                                    Resource Title
                                </label>

                                <input
                                    type="text"
                                    name="title"
                                    placeholder="e.g. Web Designing Practical Notes"
                                    value={formData.title}
                                    onChange={handleChange}
                                />

                            </div>


                            <div className="upload-field">

                                <label>
                                    Subject
                                </label>

                                <input
                                    type="text"
                                    name="subject"
                                    placeholder="e.g. Web Designing"
                                    value={formData.subject}
                                    onChange={handleChange}
                                />

                            </div>

                        </div>


                        <div className="upload-field">

                           <label>
    Semester <span>(Optional)</span>
</label>

                            <select
                                name="semester"
                                value={formData.semester}
                                onChange={handleChange}
                            >

                                <option value="">
                                    Select Semester
                                </option>

                                <option value="1st Semester">
                                    1st Semester
                                </option>

                                <option value="2nd Semester">
                                    2nd Semester
                                </option>

                                <option value="3rd Semester">
                                    3rd Semester
                                </option>

                                <option value="4th Semester">
                                    4th Semester
                                </option>

                                <option value="5th Semester">
                                    5th Semester
                                </option>

                                <option value="6th Semester">
                                    6th Semester
                                </option>

                            </select>

                        </div>


                        <div className="upload-field">

                            <label>
                                Description
                            </label>

                            <textarea
                                name="description"
                                placeholder="Briefly describe what this resource contains..."
                                rows="5"
                                value={formData.description}
                                onChange={handleChange}
                            ></textarea>

                        </div>


                        <div className="upload-field">

                            <label>
                                Study Material
                            </label>

                            <div className="file-upload">

                                <input
                                    id="file-input"
                                    type="file"
                                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                                    onChange={handleFileChange}
                                />

                                <div className="file-upload-text">

                                    <strong>
                                        {file
                                            ? file.name
                                            : "Choose your study material"}
                                    </strong>

                                    <span>
                                        PDF, DOC, DOCX, PPT or PPTX
                                    </span>

                                </div>

                            </div>

                        </div>


                        <button
                            type="submit"
                            className="upload-submit"
                            disabled={loading}
                        >

                            {loading
                                ? "Uploading..."
                                : "Upload Resource"}

                        </button>

                    </form>

                </div>

            </div>

        </div>
    );
}

export default Upload;