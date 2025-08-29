const socket = require('socket.io');
const crypto = require('crypto');
const Chat = require('../models/chat');

const getSecreatRoomId = (userId, targetUserId) => {
    return crypto.createHash('sha256').update([userId, targetUserId].sort().join("_")).digest('hex');
}

const initializeSocket = (server) => {
    const io = socket(server, {
        cors: {
            origin: [process.env.TINDER_4_DEVS_FRONTEND, process.env.TINDER_4_DEVS_LOCALHOST],
            credentials: true
        }
    });

    io.on("connection", (socket) => {

        socket.on("joinChat", ({ userId, targetUserId, firstName }) => {
            const roomId = getSecreatRoomId(userId, targetUserId);
            socket.join(roomId);

            console.log(`${firstName} joined room: ${roomId}`);
        })

        socket.on("sendMessage", async ({ firstName,
            userId,
            targetUserId,
            text,
            timestamp
        }) => {
            try {

                let chat = await Chat.findOne({
                    participants: { $all: [userId, targetUserId] },
                })
                if (!chat || chat.length === 0) {
                    chat = new Chat({
                        participants: [userId, targetUserId],
                        messages: []
                    })
                }

                chat.messages.push({
                    senderId: userId,
                    text,
                    timestamp
                })

                await chat.save()
                const roomId = getSecreatRoomId(userId, targetUserId);
                console.log(` ${firstName} : ${text}`);
                io.to(roomId).emit("receiveMessage", {
                    senderId: userId,
                    text,
                    timestamp,
                });
            } catch (err) {
                console.log("Error in sendMessage socket:", err);
            }
        })

        socket.on("disconnect", () => {
            console.log("User disconnected", socket.id);
        })
    });
}

module.exports = initializeSocket;