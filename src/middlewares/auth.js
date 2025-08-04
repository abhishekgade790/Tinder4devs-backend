const jwt = require('jsonwebtoken');
const User = require('../models/../models/User');

const userAuth = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        const decodedObj = await jwt.verify(token, "TiNdEr4deV");
        const { _id } = decodedObj;

        const user = await User.findById(_id);
        if (!user) {
            throw new Error("user not found. Please Login Again");
        } else {
            req.user = user;
            next();
        }
    } catch (err) {
        res.status(401).send("Unauthorized: " + err);
    }
}

module.exports = userAuth;