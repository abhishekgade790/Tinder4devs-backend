const socket = require('socket.io');
const crypto = require('crypto');

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

        socket.on("sendMessage", ({ firstName,
            userId,
            targetUserId,
            text: messageInput,
            timestamp }) => {
            const roomId = getSecreatRoomId(userId, targetUserId);
            console.log(` ${firstName} : ${messageInput}`);
            io.to(roomId).emit("receiveMessage", {
                senderId: userId,
                text: messageInput,
                timestamp
            });

        })

        socket.on("disconnect", () => {
            console.log("User disconnected", socket.id);
        })
    });
}

module.exports = initializeSocket;