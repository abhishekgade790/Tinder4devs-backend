const express = require("express");
const userAuth = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require('../models/user');
const userRouter = express.Router();

const USER_SAFE_DATA = "firstName lastName age gender skills photoUrl about";

//get all pending requests
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const connectionRequests = await ConnectionRequest.find({
            toUserId: loggedInUserId,
            status: "interested"
        }).populate("fromUserId", USER_SAFE_DATA)

        if (!connectionRequests || connectionRequests.length === 0) {
            return res.json({
                message: "No pending requests found."
            });
        }


        res.json({
            connectionRequests
        })

    } catch (err) {
        res.status(500).send(err);

    }
})

//get all connections
userRouter.get("/user/connections", userAuth, async (req, res) => {
    try {
        const loggedInUserId = req.user.id;

        const connections = await ConnectionRequest.find({
            $or: [
                { fromUserId: loggedInUserId, status: "accepted" },
                { toUserId: loggedInUserId, status: "accepted" }
            ]
        })
            .populate("fromUserId", USER_SAFE_DATA)
            .populate("toUserId", USER_SAFE_DATA);

        const data = connections.map((connection) => {
            if (connection.fromUserId.equals(loggedInUserId)) {
                return connection.toUserId
            } else {
                return connection.fromUserId
            }
        })

        res.send({
            data
        })

    } catch (err) {
        res.status(400).send( err);
    }
})

//feed
userRouter.get("/user/feed", userAuth, async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        const page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        limit = limit > 50 ? 50 : limit;

        const skip = (page - 1) * limit;

        const connections = await ConnectionRequest.find({
            $or: [{
                fromUserId: loggedInUserId
            }, {
                toUserId: loggedInUserId
            }]
        }).select("fromUserId toUserId")

        const hideUsers = new Set()

        connections.forEach(user => {
            hideUsers.add(user.fromUserId.toString());
            hideUsers.add(user.toUserId.toString());
        });

        const users = await User.find({
            _id: { $nin: Array.from(hideUsers) }
        }).select(USER_SAFE_DATA)
            .skip(skip)
            .limit(limit)

        res.send(users)



    } catch (err) {
        res.status(400).send( err);
    }
})

module.exports = userRouter;