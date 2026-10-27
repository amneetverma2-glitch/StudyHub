
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        fullname: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: function () {
                return this.authProvider !== "google";
            }
        },
        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local"
        },
        googleId: {
            type: String,
            sparse: true,
            unique: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
