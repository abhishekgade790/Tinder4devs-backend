const express = require("express");
const userAuth = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require('../models/user');
const userRouter = express.Router();
const { sendMail } = require('../utils/emailService')


const USER_SAFE_DATA = "firstName lastName age gender skills photoUrl about isPremium membershipType";

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
        res.status(400).send(err);
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
        res.status(400).send(err);
    }
})

userRouter.get("/user/email", userAuth, async (req, res) => {
    try {
        async function testEmail() {
            try {
                const to = "45abcreations@gmail.com";
                const subject = "You Have a New Connection Request on Tinder4Devs";
                const text = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Hello dear,</h2>
            <p><strong>abhi</strong> has shown interest in connecting with you on <b>Tinder4Devs</b>.</p>
            <p style="margin: 16px 0;">
                Click below to view the request and respond:
            </p>
            <p style="background-color: #a8efff; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">
                View Connection Request<br/>
                https://tinder4devs.vercel.app
            </p>
             
            <p style="margin-top: 20px; font-size: 14px; color: #555;">
                Thank you for being part of the Tinder4Devs community.<br>
                – The Tinder4Devs Team
            </p>
        </div>
    `;

                const response = await sendMail(to, subject, text);

                console.log(response)
                res.send(response);
            } catch (error) {
                console.log(error)
            }
        }

        testEmail()
    } catch (err) {
        res.send(err);
    }
})

module.exports = userRouter;

