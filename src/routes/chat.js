const express = require('express');
const userAuth = require('../middlewares/auth');
const Chat = require('../models/chat');

const chatRouter = express.Router();

chatRouter.get('/chat/:targetUserId', userAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { targetUserId } = req.params

        let chat = await Chat.findOne({
            participants: { $all: [userId, targetUserId] },
        })

        if (!chat) {
            chat = new Chat({
                participants: [userId, targetUserId],
                messages: []
            })
        }

        await chat.save()

        res.json(chat);
    } catch (err) {
        console.log("Error in GET /chat/:targetUserId", err);
        res.status(500).json({ error: "Internal server error" })
    }
})

module.exports = chatRouter;