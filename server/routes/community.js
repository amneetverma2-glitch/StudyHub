
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const CommunityQuestion = require("../models/CommunityQuestion");
const User = require("../models/User");

const router = express.Router();

// Authenticate logged-in users using the existing JWT
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Please log in first." });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "studyhub_secret_key"
    );

    const userId = decoded.id || decoded.userId || decoded.user_id;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ message: "Invalid login session." });
    }

    const user = await User.findById(userId).select("_id fullname email");

    if (!user) {
      return res.status(401).json({ message: "User account not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired login session." });
  }
};

// GET all community questions
router.get("/questions", async (req, res) => {
  try {
    const { search, topic, sort } = req.query;

    const filter = {};

    if (topic && topic !== "All Topics") {
      filter.topic = topic;
    }

    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    let query = CommunityQuestion.find(filter)
      .populate("author", "fullname")
      .populate("answers.author", "fullname");

    if (sort === "oldest") {
      query = query.sort({ createdAt: 1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const questions = await query.limit(100).lean();

    res.json(questions);
  } catch (error) {
    console.error("Community questions error:", error);
    res.status(500).json({ message: "Could not load questions." });
  }
});

// POST a new question
router.post("/questions", authenticateUser, async (req, res) => {
  try {
    const { title, description, topic } = req.body;

    const allowedTopics = [
      "Programming",
      "Web Development",
      "Data Science",
      "Java",
      "DBMS",
    ];

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 180
    ) {
      return res.status(400).json({
        message: "Enter a question title (maximum 180 characters).",
      });
    }

    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 5000
    ) {
      return res.status(400).json({
        message: "Enter question details (maximum 5000 characters).",
      });
    }

    if (!allowedTopics.includes(topic)) {
      return res.status(400).json({ message: "Choose a valid topic." });
    }

    const question = await CommunityQuestion.create({
      author: req.user._id,
      title: title.trim(),
      description: description.trim(),
      topic,
      answers: [],
      upvotes: [],
      followers: [],
    });

    const populatedQuestion = await CommunityQuestion.findById(question._id)
      .populate("author", "fullname")
      .populate("answers.author", "fullname")
      .lean();

    res.status(201).json(populatedQuestion);
  } catch (error) {
    console.error("Create community question error:", error);
    res.status(500).json({ message: "Could not publish question." });
  }
});

// POST an answer to a question
router.post("/questions/:id/answers", authenticateUser, async (req, res) => {
  try {
    const { text } = req.body;

    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.trim().length > 3000
    ) {
      return res.status(400).json({
        message: "Enter an answer (maximum 3000 characters).",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid question ID." });
    }

    const question = await CommunityQuestion.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }

    question.answers.push({
      author: req.user._id,
      text: text.trim(),
      upvotes: [],
    });

    await question.save();

    const updatedQuestion = await CommunityQuestion.findById(question._id)
      .populate("author", "fullname")
      .populate("answers.author", "fullname")
      .lean();

    res.status(201).json(updatedQuestion);
  } catch (error) {
    console.error("Post community answer error:", error);
    res.status(500).json({ message: "Could not post answer." });
  }
});

// TOGGLE question upvote
router.post("/questions/:id/upvote", authenticateUser, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid question ID." });
    }

    const question = await CommunityQuestion.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }

    const userId = req.user._id.toString();
    const alreadyVoted = question.upvotes.some(
      (id) => id.toString() === userId
    );

    if (alreadyVoted) {
      question.upvotes.pull(req.user._id);
    } else {
      question.upvotes.addToSet(req.user._id);
    }

    await question.save();

    res.json({
      upvoted: !alreadyVoted,
      upvotes: question.upvotes.length,
    });
  } catch (error) {
    console.error("Question upvote error:", error);
    res.status(500).json({ message: "Could not update upvote." });
  }
});

// TOGGLE following a question
router.post("/questions/:id/follow", authenticateUser, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid question ID." });
    }

    const question = await CommunityQuestion.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }

    const userId = req.user._id.toString();
    const alreadyFollowing = question.followers.some(
      (id) => id.toString() === userId
    );

    if (alreadyFollowing) {
      question.followers.pull(req.user._id);
    } else {
      question.followers.addToSet(req.user._id);
    }

    await question.save();

    res.json({ following: !alreadyFollowing });
  } catch (error) {
    console.error("Question follow error:", error);
    res.status(500).json({ message: "Could not update follow status." });
  }
});

module.exports = router;
