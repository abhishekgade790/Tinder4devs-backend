const mongoose = require('mongoose');

const connectionRequestSchema = new mongoose.Schema({
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },

    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    status: {
        type: String,
        enum: {
            values: ["interested", "ignore", "accepted", "rejected"],
            message: "Status must be either 'interested','ignore','accepted', or 'rejected'"
        },
        required: true
    },
}, {
    timestamps: true,
})

connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 })

const ConnectionRequest = mongoose.model('ConnectionRequest', connectionRequestSchema);

module.exports = ConnectionRequest;