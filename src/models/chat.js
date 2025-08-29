const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: String,
        default: () => new Date().toLocaleTimeString()
    }
})

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    messages: [messageSchema]
})

const Chat = mongoose.model("chat", chatSchema);
module.exports = Chat