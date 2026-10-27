
const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        subject: {
            type: String,
            required: true,
            trim: true
        },

        semester: {
    type: String,
    default: ""
},

      description: {
    type: String,
    default: ""
},

        file_name: {
            type: String,
            required: true
        },

        // Reference to the actual file stored in MongoDB GridFS
        gridfs_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        downloads: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Note", noteSchema);
