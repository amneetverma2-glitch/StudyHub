
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        note_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Note",
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            default: "",
            trim: true
        }
    },
    {
        timestamps: true
    }
);

reviewSchema.index(
    { user_id: 1, note_id: 1 },
    { unique: true }
);

module.exports = mongoose.model("Review", reviewSchema);
