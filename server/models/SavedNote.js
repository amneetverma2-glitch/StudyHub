
const mongoose = require("mongoose");

const savedNoteSchema = new mongoose.Schema(
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
        }
    },
    {
        timestamps: true
    }
);

// Prevent the same user from saving the same note twice
savedNoteSchema.index(
    { user_id: 1, note_id: 1 },
    { unique: true }
);

module.exports = mongoose.model("SavedNote", savedNoteSchema);
