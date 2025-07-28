const express = require('express');
const userAuth = require('../middlewares/auth');
const ConnectionRequest = require('../models/connectionRequest');
const User = require('../models/User');

const requestRouter = express.Router();

//send Request
requestRouter.post("/request/send/:status/:toUserId", userAuth, async (req, res) => {
    try {
        const fromUserID = req.user._id;
        const toUserID = req.params.toUserId;
        const status = req.params.status;

        const validStatuses = ["interested", "ignore"];
        const isValidStatus = validStatuses.includes(status);

        if (!isValidStatus) {
            return res.status(400).json({
                message: "Invalid status. Status must be either 'interested' or 'ignore'."
            });
        }

        if (fromUserID.equals(toUserID)) {
            return res.status(400).json({
                message: "You cannot send a connection request to yourself."
            });
        }

        const toUser = await User.findOne({ _id: toUserID });
        if (!toUser) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const existConnectionRequest = await ConnectionRequest.findOne({ fromUserId: fromUserID, toUserId: toUserID });

        if (existConnectionRequest) {
            return res.status(400).json({
                message: "Connection request already exists."
            });
        }

        const existRecievedRequest = await ConnectionRequest.findOne({ fromUserId: toUserID, toUserId: fromUserID });
        if (existRecievedRequest) {
            existRecievedRequest.status = "accepted";
            await existRecievedRequest.save();
            return res.status(201).json({
                message: `${toUser.firstName}'s connection request has been accepted.`,
                data: existRecievedRequest
            });
        }


        const request = new ConnectionRequest({
            fromUserId: fromUserID,
            toUserId: toUserID,
            status: status
        });
        const data = await request.save();
        res.json({
            message: status === "interested" ? `sended connection request to ${toUser.firstName}` : `you ignored ${toUser.firstName}.`,
            data
        });

    } catch (err) {
        res.status(404).send(err);
    }
})

//review Request
requestRouter.post("/request/review/:status/:requestId", userAuth, async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const { status, requestId } = req.params;

        const validStatuses = ["accepted", "rejected"];
        const isValidStatus = validStatuses.includes(status);
        if (!isValidStatus) {
            return res.status(400).json({
                message: "Invalid status. Status must be either 'accepted' or 'rejected'."
            });
        }

        const connectionRequest = await ConnectionRequest.findOne({
            _id: requestId,
            toUserId: loggedInUserId,
            status: "interested"
        });

        if (!connectionRequest) {
            return res.status(404).json({
                message: "Connection request not found or already accepted or rejected."
            });
        }

        connectionRequest.status = status;
        const updatedData = await connectionRequest.save();
        res.json({
            message: "Connection request " + status,
            data: updatedData
        });
    } catch (err) {
        res.status(400).send( err);
    }
})
module.exports = requestRouter;