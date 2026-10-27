
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        note_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Note",
            default: null
        },
        activity_type: {
            type: String,
            required: true,
            enum: ["upload", "download", "save", "preview", "summary"]
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: false
        }
    }
);

module.exports = mongoose.model("Activity", activitySchema);
