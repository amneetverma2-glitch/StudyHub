
const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const communityQuestionSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    topic: {
      type: String,
      required: true,
      enum: [
        "Programming",
        "Web Development",
        "Data Science",
        "Java",
        "DBMS",
      ],
      default: "Programming",
    },
    answers: [answerSchema],
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CommunityQuestion",
  communityQuestionSchema
);
