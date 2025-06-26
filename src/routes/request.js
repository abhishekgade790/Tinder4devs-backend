const express = require('express');
const userAuth = require('../middlewares/auth');
const requestRouter = express.Router();


requestRouter.post("/sendConnectionRequest", userAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            throw new Error("Its seems like you are not logged in. Please Login Again");
        }
        res.send(user.firstName + " " + user.lastName + " send you a connection request.")
    } catch (err) {
        res.status(404).send("ERROR : " + err);
    }
})

module.exports = requestRouter;