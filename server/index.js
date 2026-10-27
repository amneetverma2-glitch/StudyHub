require("dotenv").config();

const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const CloudConvert = require("cloudconvert");
const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const { Readable } = require("stream");
const { PDFParse } = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");
const mammoth = require("mammoth");
const JSZip = require("jszip");

const connectDB = require("./db");
const User = require("./models/User");
const Note = require("./models/Note");
const Activity = require("./models/Activity");
const SavedNote = require("./models/SavedNote");
const Review = require("./models/Review");
const CommunityQuestion = require("./models/CommunityQuestion");

const app = express();
const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);
const PORT = process.env.PORT || 5000;
let gfsBucket = null;

const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

app.use(cors());
app.use(express.json());
app.use("/api/community", require("./routes/community"));

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    storage: multer.memoryStorage()
});

app.use("/uploads", express.static(uploadDir));

app.use(
    "/uploads",
    express.static("C:/xampp/htdocs/studyhub/uploads")
);

const isValidId = (id) =>
    typeof id === "string" &&
    mongoose.Types.ObjectId.isValid(id);

const idString = (id) =>
    id == null ? null : id.toString();


// ========================================
// ACTIVITY LOGGER
// ========================================

async function logActivity(userId, noteId, activityType) {
    try {
        if (!isValidId(idString(userId))) return;

        if (noteId && !isValidId(idString(noteId))) {
            noteId = null;
        }

        await Activity.create({
            user_id: userId,
            note_id: noteId || null,
            activity_type: activityType
        });
    } catch (error) {
        console.error("Activity logging error:", error.message);
    }
}


// ========================================
// FORMAT NOTES WITH UPLOADER AND RATINGS
// ========================================

async function formatNotes(notes) {
    return Promise.all(
        notes.map(async (item) => {
            const note = item.toObject
                ? item.toObject()
                : item;

            const noteId = note._id || note.id;
            const userId = note.user_id?._id || note.user_id;

            const [uploader, stats] = await Promise.all([
                User.findById(userId)
                    .select("fullname")
                    .lean(),

                Review.aggregate([
                    {
                        $match: {
                            note_id: new mongoose.Types.ObjectId(
                                idString(noteId)
                            )
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            avg_rating: { $avg: "$rating" },
                            total_reviews: { $sum: 1 }
                        }
                    }
                ])
            ]);

            const reviewStats = stats[0] || {};

            return {
                ...note,
                id: idString(noteId),
                _id: idString(noteId),
                user_id: idString(userId),
                uploader_name: uploader?.fullname || "Unknown",
                avg_rating: reviewStats.avg_rating == null
                    ? null
                    : Math.round(reviewStats.avg_rating * 10) / 10,
                total_reviews: reviewStats.total_reviews || 0,
                upload_date: note.createdAt || note.upload_date || null
            };
        })
    );
}


// ========================================
// FIND UPLOADED FILE
// ========================================

function findActualFile(fileName) {
    const safeName = path.basename(fileName || "");

    const serverFile = path.join(uploadDir, safeName);
    const xamppFile = path.join(
        "C:/xampp/htdocs/studyhub/uploads",
        safeName
    );

    if (fs.existsSync(serverFile)) return serverFile;
    if (fs.existsSync(xamppFile)) return xamppFile;

    return null;
}


// ========================================
// HOME / TEST ROUTE
// ========================================

app.get("/", (_req, res) => {
    res.json({
        message: "StudyHub Backend is running!"
    });
});


// ========================================
// GET ALL NOTES / SEARCH NOTES
// ========================================

app.get("/api/notes", async (req, res) => {
    try {
        const search = String(req.query.search || "").trim();

        const escapedSearch = search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const filter = search
            ? {
                $or: [
                    {
                        title: {
                            $regex: escapedSearch,
                            $options: "i"
                        }
                    },
                    {
                        subject: {
                            $regex: escapedSearch,
                            $options: "i"
                        }
                    }
                ]
            }
            : {};

        const notes = await Note.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        res.json(await formatNotes(notes));
    } catch (error) {
        console.error("Error fetching notes:", error);

        res.status(500).json({
            message: "Failed to fetch notes"
        });
    }
});


// ========================================
// REGISTER USER
// ========================================

app.post("/api/auth/register", async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        if (!fullname || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            fullname: String(fullname).trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        res.status(201).json({
            message: "Account created successfully",
            user_id: user._id.toString()
        });
    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        res.status(500).json({
            message: "Failed to create account"
        });
    }
});



/* ========================================
   LOGIN USER - EMAIL AND PASSWORD
======================================== */

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({
            email: String(email).trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        if (user.authProvider === "google" && !user.password) {
            return res.status(401).json({
                message: "This account uses Google login. Please continue with Google."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email
            },
            process.env.JWT_SECRET || "studyhub_secret_key",
            { expiresIn: "7d" }
        );

        return res.json({
            message: "Login successful.",
            token,
            user: {
                id: user._id.toString(),
                fullname: user.fullname,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Login failed. Please try again."
        });
    }
});


/* ========================================
   GOOGLE LOGIN - EXISTING GOOGLE USERS ONLY
======================================== */

app.post("/api/auth/google", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential || !process.env.GOOGLE_CLIENT_ID) {
            return res.status(400).json({
                message: "Google login is not configured."
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (
            !payload ||
            !payload.email ||
            !payload.email_verified ||
            !payload.sub
        ) {
            return res.status(401).json({
                message: "Please use a verified Google account."
            });
        }

        const email = payload.email.toLowerCase().trim();

        // Find the existing Google account
        const user = await User.findOne({
            email,
            authProvider: "google",
            googleId: payload.sub
        });

        if (!user) {
            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return res.status(409).json({
                    message: "This email belongs to a different account. Please use your original login method."
                });
            }

            return res.status(404).json({
                message: "No account found. Please register first."
            });
        }

        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email
            },
            process.env.JWT_SECRET || "studyhub_secret_key",
            { expiresIn: "7d" }
        );

        return res.json({
            message: "Google login successful.",
            token,
            user: {
                id: user._id.toString(),
                fullname: user.fullname,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Google login error:", error);

        return res.status(401).json({
            message: "Google sign-in failed. Please try again."
        });
    }
});


/* ========================================
   GOOGLE REGISTER ROUTE
======================================== */

app.post("/api/auth/google/register", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential || !process.env.GOOGLE_CLIENT_ID) {
            return res.status(400).json({
                message: "Google registration is not configured."
            });
        }

        // Verify the Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (
            !payload ||
            !payload.email ||
            !payload.email_verified ||
            !payload.sub
        ) {
            return res.status(401).json({
                message: "Please use a verified Google account."
            });
        }

        const email = payload.email.toLowerCase().trim();

        // Check whether this email already has an account
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message:
                    "Your account already exists. Please log in."
            });
        }

        // Create a new Google account
        await User.create({
            fullname: payload.name || email.split("@")[0],
            email,
            authProvider: "google",
            googleId: payload.sub
        });

        return res.status(201).json({
            message:
                "Account created successfully! Please log in."
        });

    } catch (error) {
        console.error("Google registration error:", error);

        // Handle duplicate email/Google ID database conflicts
        if (error.code === 11000) {
            return res.status(409).json({
                message:
                    "Your account already exists. Please log in."
            });
        }

        return res.status(401).json({
            message:
                "Google registration failed. Please try again."
        });
    }
});


/* ========================================
   CHANGE PASSWORD
======================================== */

app.put("/api/auth/change-password", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Please log in again."
            });
        }

        const token = authHeader.split(" ")[1];

        let decoded;

        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "studyhub_secret_key"
            );
        } catch (error) {
            return res.status(401).json({
                message: "Your session has expired. Please log in again."
            });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current and new passwords are required."
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "New password must be at least 8 characters."
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                message: "New password must differ from the current password."
            });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({
                message: "User account not found."
            });
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                message: "Your current password is incorrect."
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return res.json({
            message: "Password changed successfully."
        });
    } catch (error) {
        console.error("Change password error:", error.message);

        return res.status(500).json({
            message: "Unable to change password. Please try again."
        });
    }
});

// ========================================
// GET USER'S UPLOADED NOTES
// ========================================

app.get("/api/user/:id/notes", async (req, res) => {
    try {
        const userId = req.params.id;

        if (!isValidId(userId)) {
            return res.status(400).json({
                message: "Invalid user"
            });
        }

        const notes = await Note.find({
            user_id: userId
        })
            .sort({ createdAt: -1 })
            .lean();

        res.json(
            notes.map((note) => ({
                ...note,
                id: note._id.toString(),
                _id: note._id.toString(),
                user_id: idString(note.user_id),
                upload_date: note.createdAt || null
            }))
        );
    } catch (error) {
        console.error("Error fetching user notes:", error);

        res.status(500).json({
            message: "Database error"
        });
    }
});
/* ========================================
   UPLOAD STUDY RESOURCE - GRIDFS
======================================== */

app.post(
    "/api/notes/upload",
    upload.single("file"),
    async (req, res) => {
        let uploadedFileId = null;

        try {
            const {
                user_id,
                title,
                subject,
                semester,
                description
            } = req.body;

            if (!req.file) {
                return res.status(400).json({
                    message: "Please select a file."
                });
            }

            if (!user_id || !title?.trim() || !subject?.trim()) {
    return res.status(400).json({
        message: "User, resource title, and subject are required."
    });
}

            if (!isValidId(user_id)) {
                return res.status(400).json({
                    message: "Invalid user."
                });
            }

            if (!gfsBucket) {
                return res.status(503).json({
                    message: "File storage is not ready. Please try again."
                });
            }

            const userExists = await User.exists({ _id: user_id });

            if (!userExists) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            const safeName = path
                .basename(req.file.originalname)
                .replace(/\s+/g, "_");

            const storedFileName = `${Date.now()}_${safeName}`;

            const gridfsId = await new Promise((resolve, reject) => {
                const uploadStream = gfsBucket.openUploadStream(
                    storedFileName,
                    {
                        contentType: req.file.mimetype || "application/octet-stream",
                        metadata: {
                            originalName: req.file.originalname
                        }
                    }
                );

                uploadStream.once("finish", () => resolve(uploadStream.id));
                uploadStream.once("error", reject);

                Readable.from(req.file.buffer).pipe(uploadStream);
            });

            uploadedFileId = gridfsId;

            const note = await Note.create({
    user_id,
    title: String(title).trim(),
    subject: String(subject).trim(),
    semester: String(semester || "").trim(),
    description: String(description || "").trim(),
    file_name: storedFileName,
    gridfs_id: gridfsId,
    downloads: 0
});

            await logActivity(user_id, note._id, "upload");

            res.status(201).json({
                message: "Resource uploaded successfully!",
                note_id: note._id.toString(),
                file_name: note.file_name,
                gridfs_id: gridfsId.toString()
            });
        } catch (error) {
            console.error("GridFS upload error:", error);

            if (uploadedFileId && gfsBucket) {
                try {
                    await gfsBucket.delete(uploadedFileId);
                } catch (cleanupError) {
                    console.error("GridFS cleanup error:", cleanupError.message);
                }
            }

            if (!res.headersSent) {
                res.status(500).json({
                    message: "Failed to save resource."
                });
            }
        }
    }
);



/* ========================================
   SERVE FILE FROM MONGODB GRIDFS ONLY
======================================== */

app.get("/api/notes/:id/file", async (req, res) => {
    try {
        const noteId = req.params.id;

        if (!isValidId(noteId)) {
            return res.status(400).json({
                message: "Invalid note ID."
            });
        }

        const note = await Note.findById(noteId);

        if (!note) {
            return res.status(404).json({
                message: "Resource not found."
            });
        }

        if (!note.gridfs_id) {
            return res.status(404).json({
                message: "This resource has no GridFS file reference."
            });
        }

        if (!gfsBucket) {
            return res.status(503).json({
                message: "MongoDB GridFS is not ready."
            });
        }

        const fileId = note.gridfs_id;

        const gridfsFile = await mongoose.connection.db
            .collection("uploads.files")
            .findOne({ _id: fileId });

        if (!gridfsFile) {
            return res.status(404).json({
                message: "File not found in MongoDB GridFS."
            });
        }

        const safeFileName = path.basename(
            note.file_name || "file"
        );

        const extension = path
            .extname(safeFileName)
            .toLowerCase();

        const mimeTypes = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".txt": "text/plain; charset=utf-8",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".ppt": "application/vnd.ms-powerpoint",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        };

        const contentType =
            mimeTypes[extension] ||
            gridfsFile.contentType ||
            "application/octet-stream";

        res.setHeader("Content-Type", contentType);

        res.setHeader(
            "Content-Disposition",
            `inline; filename="${safeFileName}"`
        );

        res.setHeader("X-Content-Type-Options", "nosniff");

        const downloadStream =
            gfsBucket.openDownloadStream(fileId);

        downloadStream.on("error", (error) => {
            console.error("GridFS preview error:", error);

            if (!res.headersSent) {
                res.status(500).end(
                    "Failed to read file from MongoDB."
                );
            } else {
                res.destroy(error);
            }
        });

        downloadStream.pipe(res);

    } catch (error) {
        console.error("GridFS file serving error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                message: "Failed to load file from MongoDB."
            });
        }
    }
});

/* ========================================
   DOWNLOAD NOTE - GRIDFS + LOCAL FALLBACK
======================================== */

app.get("/api/notes/:id/download", async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.query.user_id;

        if (!isValidId(noteId) || !isValidId(userId)) {
            return res.status(400).json({
                message: "Invalid note or user."
            });
        }

        const note = await Note.findById(noteId);

        if (!note) {
            return res.status(404).json({
                message: "Note not found."
            });
        }

        let gridfsFile = null;

        if (note.gridfs_id && gfsBucket) {
            gridfsFile = await mongoose.connection.db
                .collection("uploads.files")
                .findOne({ _id: note.gridfs_id });
        }

        note.downloads = (note.downloads || 0) + 1;
        await note.save();

        await logActivity(userId, note._id, "download");

        const safeFileName = path.basename(note.file_name || "download");

        if (gridfsFile) {
            res.setHeader(
                "Content-Type",
                gridfsFile.contentType || "application/octet-stream"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${safeFileName}"`
            );

            const downloadStream = gfsBucket.openDownloadStream(note.gridfs_id);

            downloadStream.on("error", (error) => {
                console.error("GridFS download error:", error);

                if (!res.headersSent) {
                    res.status(500).end("Failed to download file.");
                } else {
                    res.destroy(error);
                }
            });

            downloadStream.pipe(res);
            return;
        }

        const actualFile = findActualFile(note.file_name);

        if (!actualFile) {
            return res.status(404).json({
                message: "File not found in GridFS or local storage."
            });
        }
        const extension = path
    .extname(note.file_name || "")
    .toLowerCase();

if (extension === ".pdf") {
    res.setHeader("Content-Type", "application/pdf");
}

        res.download(actualFile, safeFileName, (error) => {
            if (error) {
                console.error("Local download error:", error);

                if (!res.headersSent) {
                    res.status(500).end("Failed to download file.");
                }
            }
        });
    } catch (error) {
        console.error("Download error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                message: "Failed to download note."
            });
        }
    }
});

 
app.post("/api/notes/:id/summarize", async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.body.user_id;

        if (!isValidId(noteId) || !isValidId(userId)) {
            return res.status(400).json({
                message: "Invalid note or user."
            });
        }

        if (!ai) {
            return res.status(500).json({
                message: "Gemini API key is not configured on the server."
            });
        }

        const note = await Note.findById(noteId);

        if (!note) {
            return res.status(404).json({
                message: "Resource not found."
            });
        }

        if (!note.file_name) {
            return res.status(404).json({
                message: "File not available."
            });
        }

        const extension = path.extname(note.file_name).toLowerCase();

        if (![".pdf", ".docx", ".pptx"].includes(extension)) {
            return res.status(400).json({
                message: "AI Summary supports PDF, DOCX and PPTX files only."
            });
        }

        // Read file from GridFS first, with local-file fallback.
        let fileBuffer = null;

        if (note.gridfs_id && gfsBucket) {
            const gridfsFile = await mongoose.connection.db
                .collection("uploads.files")
                .findOne({ _id: note.gridfs_id });

            if (gridfsFile) {
                const chunks = [];
                const stream = gfsBucket.openDownloadStream(note.gridfs_id);

                fileBuffer = await new Promise((resolve, reject) => {
                    stream.on("data", chunk => chunks.push(chunk));
                    stream.on("error", reject);
                    stream.on("end", () => resolve(Buffer.concat(chunks)));
                });
            }
        }

        if (!fileBuffer) {
            const actualFile = findActualFile(note.file_name);

            if (!actualFile) {
                return res.status(404).json({
                    message: "File not found in GridFS or local storage."
                });
            }

            fileBuffer = fs.readFileSync(actualFile);
        }

        let extractedText = "";

        // PDF text extraction
        if (extension === ".pdf") {
            const parser = new PDFParse({ data: fileBuffer });

            try {
                const result = await parser.getText();
                extractedText = result.text || "";
            } finally {
                await parser.destroy();
            }
        }

        // Word document text extraction
        else if (extension === ".docx") {
            const result = await mammoth.extractRawText({
                buffer: fileBuffer
            });

            extractedText = result.value || "";
        }

        // PowerPoint slide text extraction
        else if (extension === ".pptx") {
            const zip = await JSZip.loadAsync(fileBuffer);
            const slideFiles = Object.keys(zip.files)
                .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
                .sort((a, b) => {
                    const numA = Number(a.match(/slide(\d+)\.xml$/)[1]);
                    const numB = Number(b.match(/slide(\d+)\.xml$/)[1]);
                    return numA - numB;
                });

            const slideTexts = [];

            for (const slideFile of slideFiles) {
                const xml = await zip.files[slideFile].async("text");

                const textMatches = [
                    ...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)
                ];

                const slideText = textMatches
                    .map(match => match[1]
                        .replace(/&amp;/g, "&")
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/&quot;/g, '"')
                        .replace(/&apos;/g, "'"))
                    .join(" ");

                if (slideText.trim()) {
                    slideTexts.push(slideText.trim());
                }
            }

            extractedText = slideTexts
                .map((text, index) => `Slide ${index + 1}:\n${text}`)
                .join("\n\n");
        }

        extractedText = extractedText.trim();

        if (!extractedText) {
            return res.status(400).json({
                message: "Could not extract readable text from this file. It may be scanned or image-only."
            });
        }

        const textForAI = extractedText.slice(0, 60000);

        const prompt = `
You are an expert academic tutor creating study notes for a college student.

Read the provided study material carefully and create clear, useful, exam-oriented notes.

# ${note.title || "Study Material"}

## 1. Topic Overview
Give a clear 2-4 sentence explanation of the topic.

## 2. Important Concepts
Identify the major concepts and explain each in simple student-friendly language.

## 3. Important Definitions
List key definitions as **Term:** Simple and clear definition.

## 4. Detailed Explanation
Explain the main topics step-by-step with useful subheadings.

## 5. Comparisons
If the document contains comparisons, present them in a Markdown table. Skip if none are supported.

## 6. Advantages / Benefits
Include benefits, limitations, applications, or uses only when supported by the document.

## 7. Important Exam Points
List specific and useful points to remember for an exam.

## 8. Quick Revision
End with a compact revision section.

RULES:
- Use only information present in the document.
- Do not invent facts or add outside knowledge.
- Skip unsupported sections.
- Preserve technical terms.
- Use Markdown headings, bullets, numbered lists and tables.
- Do not use raw HTML.
- Start directly with the title.
- Avoid unnecessary repetition.

DOCUMENT INFORMATION:
Title: ${note.title || "Study Material"}
Subject: ${note.subject || "Not specified"}
Semester: ${note.semester || "Not specified"}
File type: ${extension}

DOCUMENT CONTENT:
${textForAI}
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt
        });

        const summary = response.text?.trim();

        if (!summary) {
            return res.status(500).json({
                message: "Gemini did not return a summary."
            });
        }

        await logActivity(userId, note._id, "summary");

        return res.json({
            message: "Summary generated successfully.",
            note_id: note._id.toString(),
            file_name: note.file_name,
            summary
        });

    } catch (error) {
        console.error("AI SUMMARY ERROR:", error);

        return res.status(500).json({
            message: error?.message || "Failed to generate summary."
        });
    }
});


// ========================================
// PREVIEW ACTIVITY
// ========================================

app.post("/api/notes/:id/preview", async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.body.user_id;

        if (!isValidId(noteId) || !isValidId(userId)) {
            return res.status(400).json({
                message: "Invalid note or user"
            });
        }

        await logActivity(userId, noteId, "preview");

        res.json({
            message: "Preview activity logged"
        });
    } catch (error) {
        console.error("Preview activity error:", error);

        res.status(500).json({
            message: "Failed to log preview activity"
        });
    }
});


 // ========================================
 // GET REVIEWS FOR A NOTE
 // ========================================

app.get("/api/notes/:id/reviews", async (req, res) => {
    try {
        const noteId = req.params.id;

        if (!isValidId(noteId)) {
            return res.status(400).json({
                message: "Invalid note ID."
            });
        }

        if (!(await Note.exists({ _id: noteId }))) {
            return res.status(404).json({
                message: "Resource not found."
            });
        }

        const reviews = await Review.find({ note_id: noteId })
            .sort({ createdAt: -1 })
            .populate("user_id", "fullname")
            .lean();

        return res.json(
            reviews.map((review) => ({
                id: review._id.toString(),
                user_id: review.user_id?._id?.toString() || null,
                fullname: review.user_id?.fullname || "Student",
                rating: review.rating,
                comment: review.comment || "",
                createdAt: review.createdAt
            }))
        );
    } catch (error) {
        console.error("Get reviews error:", error);

        return res.status(500).json({
            message: "Failed to fetch reviews."
        });
    }
});


// ========================================
// SUBMIT OR UPDATE A REVIEW
// ========================================

app.post("/api/notes/:id/reviews", async (req, res) => {
    try {
        const noteId = req.params.id;
        const { user_id, rating, comment } = req.body;

        if (!isValidId(noteId) || !isValidId(user_id)) {
            return res.status(400).json({
                message: "Invalid note or user ID."
            });
        }

        const numericRating = Number(rating);

        if (
            !Number.isInteger(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            return res.status(400).json({
                message: "Rating must be between 1 and 5."
            });
        }

        const cleanComment = String(comment || "").trim();

        if (cleanComment.length > 2000) {
            return res.status(400).json({
                message: "Comment cannot exceed 2000 characters."
            });
        }

        const [userExists, noteExists] = await Promise.all([
            User.exists({ _id: user_id }),
            Note.exists({ _id: noteId })
        ]);

        if (!userExists || !noteExists) {
            return res.status(404).json({
                message: "User or resource not found."
            });
        }

        const review = await Review.findOneAndUpdate(
            {
                user_id,
                note_id: noteId
            },
            {
                $set: {
                    rating: numericRating,
                    comment: cleanComment
                },
                $setOnInsert: {
                    user_id,
                    note_id: noteId
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        await review.populate("user_id", "fullname");

        return res.json({
            message: "Review saved successfully.",
            review: {
                id: review._id.toString(),
                user_id: review.user_id?._id?.toString() || user_id,
                fullname: review.user_id?.fullname || "Student",
                rating: review.rating,
                comment: review.comment || "",
                createdAt: review.createdAt
            }
        });
    } catch (error) {
        console.error("Submit review error:", error);

        return res.status(500).json({
            message: "Failed to save review."
        });
    }
});


// ========================================
// SAVE NOTE
// ========================================

app.post("/api/notes/:id/save", async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.body.user_id;

        if (!isValidId(noteId) || !isValidId(userId)) {
            return res.status(400).json({
                message: "Invalid note or user"
            });
        }

        const [userExists, noteExists, saved] = await Promise.all([
            User.exists({ _id: userId }),
            Note.exists({ _id: noteId }),
            SavedNote.exists({
                user_id: userId,
                note_id: noteId
            })
        ]);

        if (!userExists || !noteExists) {
            return res.status(404).json({
                message: "User or note not found"
            });
        }

        if (saved) {
            return res.status(409).json({
                message: "Note already saved"
            });
        }

        await SavedNote.create({
            user_id: userId,
            note_id: noteId
        });

        await logActivity(userId, noteId, "save");

        res.status(201).json({
            message: "Note saved successfully"
        });
    } catch (error) {
        console.error("Save note error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Note already saved"
            });
        }

        res.status(500).json({
            message: "Failed to save note"
        });
    }
});


// ========================================
// UNSAVE NOTE
// ========================================

app.delete("/api/notes/:id/save", async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.body.user_id;

        if (!isValidId(noteId) || !isValidId(userId)) {
            return res.status(400).json({
                message: "Invalid note or user"
            });
        }

        await SavedNote.deleteOne({
            user_id: userId,
            note_id: noteId
        });

        res.json({
            message: "Note removed from saved items"
        });
    } catch (error) {
        console.error("Unsave note error:", error);

        res.status(500).json({
            message: "Failed to unsave note"
        });
    }
});
// ========================================
// GET SAVED NOTES
// ========================================

app.get("/api/user/:id/saved-notes", async (req, res) => {
    try {
        const userId = req.params.id;

        if (!isValidId(userId)) {
            return res.status(400).json({
                message: "Invalid user"
            });
        }

        const savedItems = await SavedNote.find({
            user_id: userId
        })
            .sort({ createdAt: -1 })
            .populate({
                path: "note_id",
                model: "Note"
            })
            .lean();

        const notes = savedItems
            .map((item) => item.note_id)
            .filter(Boolean);

        res.json(await formatNotes(notes));
    } catch (error) {
        console.error("Saved notes error:", error);

        res.status(500).json({
            message: "Database error"
        });
    }
});


// ========================================
// GET RECENT USER ACTIVITIES
// ========================================

app.get("/api/user/:id/recent-activity", async (req, res) => {
    try {
        const userId = req.params.id;

        if (!isValidId(userId)) {
            return res.status(400).json({
                message: "Invalid user"
            });
        }

        const activities = await Activity.find({
            user_id: userId
        })
            .sort({ created_at: -1 })
            .limit(5)
            .populate({
                path: "note_id",
                model: "Note",
                select: "title file_name"
            })
            .lean();

        res.json(
            activities.map((activity) => ({
                id: activity._id.toString(),
                activity_type: activity.activity_type,
                created_at:
                    activity.created_at ||
                    activity.createdAt ||
                    null,
                title: activity.note_id?.title || null,
                file_name: activity.note_id?.file_name || null
            }))
        );
    } catch (error) {
        console.error("Error fetching recent activities:", error);

        res.status(500).json({
            message: "Failed to fetch recent activities"
        });
    }
});
// ========================================
// CONVERT PPTX TO PDF (CloudConvert)
// ========================================

app.post("/api/convert-pptx/:id", async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid note ID."
            });
        }

        if (!process.env.CLOUDCONVERT_API_KEY) {
            return res.status(503).json({
                message: "CloudConvert API key is not configured on the server."
            });
        }

        if (!gfsBucket) {
            return res.status(503).json({
                message: "File storage is not ready. Please try again."
            });
        }

        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({
                message: "Note not found."
            });
        }

        if (path.extname(note.file_name || "").toLowerCase() !== ".pptx") {
            return res.status(400).json({
                message: "Only PPTX files are supported."
            });
        }

        if (!note.gridfs_id) {
            return res.status(404).json({
                message: "This PPTX file is not stored in GridFS."
            });
        }

        // Read the PPTX directly from MongoDB GridFS.
        const chunks = [];

        await new Promise((resolve, reject) => {
            const downloadStream = gfsBucket.openDownloadStream(
                note.gridfs_id
            );

            downloadStream.on("data", (chunk) => {
                chunks.push(chunk);
            });

            downloadStream.once("error", reject);
            downloadStream.once("end", resolve);
        });

        const fileBuffer = Buffer.concat(chunks);

        if (!fileBuffer.length) {
            return res.status(400).json({
                message: "The PPTX file is empty."
            });
        }

        // Create CloudConvert conversion job.
        const job = await cloudConvert.jobs.create({
            tasks: {
                "import-pptx": {
                    operation: "import/upload"
                },

                "convert-pdf": {
                    operation: "convert",
                    input: "import-pptx",
                    output_format: "pdf",
                    engine: "office"
                },

                "export-pdf": {
                    operation: "export/url",
                    input: "convert-pdf"
                }
            }
        });

        const uploadTask = job.tasks?.find(
            (task) => task.name === "import-pptx"
        );

        const uploadForm = uploadTask?.result?.form;

        if (!uploadForm?.url || !uploadForm?.parameters) {
            throw new Error(
                "CloudConvert did not return an upload form."
            );
        }

        const form = new FormData();

        for (const [key, value] of Object.entries(uploadForm.parameters)) {
            form.append(key, String(value));
        }

        form.append(
            "file",
            new Blob([fileBuffer], {
                type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            }),
            path.basename(note.file_name)
        );

        const uploadResponse = await fetch(uploadForm.url, {
            method: "POST",
            body: form
        });

        if (!uploadResponse.ok) {
            const body = await uploadResponse.text().catch(() => "");

            throw new Error(
                `CloudConvert upload failed (${uploadResponse.status}): ${body.slice(0, 1000)}`
            );
        }

        // Wait for the conversion job to finish.
        const completedJob = await cloudConvert.jobs.wait(job.id);

        const exportTask = completedJob.tasks?.find(
            (task) => task.name === "export-pdf"
        );

        if (exportTask?.status === "error") {
            throw new Error(
                `CloudConvert conversion task failed: ${JSON.stringify(
                    exportTask.message || exportTask.code || "Unknown error"
                )}`
            );
        }

        const pdfUrl = exportTask?.result?.files?.[0]?.url;

        if (!pdfUrl) {
            throw new Error(
                `CloudConvert did not return a PDF URL. Job status: ${completedJob.status || "unknown"}`
            );
        }

        return res.json({ pdfUrl });
    } catch (error) {
        console.error("PPTX conversion error:", {
            message: error?.message,
            status: error?.status,
            statusCode: error?.statusCode,
            response: error?.response?.data || error?.response?.body || null
        });

        return res.status(500).json({
            message: "PPTX conversion failed. Check the backend terminal for the detailed CloudConvert error."
        });
    }
});


// ========================================
// CONNECT DATABASE AND START SERVER
// ========================================

connectDB()
    .then(() => {
        gfsBucket = new GridFSBucket(mongoose.connection.db, {
            bucketName: "uploads"
        });

        console.log("MongoDB GridFS initialized successfully!");

        app.listen(PORT, () => {
            console.log(
                `StudyHub server running on http://localhost:${PORT}`
            );
        });
    })
    .catch((error) => {
        console.error(
            "Could not start StudyHub server:",
            error.message
        );

        process.exit(1);
    });