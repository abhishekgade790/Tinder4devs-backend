const express = require('express');
const userAuth = require('../middlewares/auth');
const profileRouter = express.Router();
const { isEditProfileValid } = require('../utils/validation')
const bcrypt = require('bcrypt');
('../models/User');
const validator = require('validator');


//profile/view
profileRouter.get("/profile/view", userAuth, async (req, res) => {
    try {
        const user = req.user;
        res.json(user);
    } catch (err) {
        res.status(400).send(err);

    }
})

//profile/edit
profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
    try {
        if (!isEditProfileValid(req)) {
            throw new Error("Invalid profile edit request..");
        }
        const user = req.user;
        Object.keys(req.body).forEach((key) => {
            user[key] = req.body[key];
        })

        await user.save().then(() => {
            res.json({
                message: "Profile updated successfully....",
                data: user
            });
        });

    } catch (err) {
        res.status(400).send(err);
    }
});

//update password 
profileRouter.patch("/profile/update-password", userAuth, async (req, res) => {
    try {
        const user = req.user;
        const passwordHash = user.password;
        const { oldPassword, newPassword } = req?.body;

        const isPasswordMatch = await bcrypt.compare(oldPassword, passwordHash);

        if (!isPasswordMatch) {
            throw new Error('Old password does not match.');
        }

        if (!validator.isStrongPassword(newPassword)) {
            throw new Error("Password must be strong: It must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character");
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        user.password = newPasswordHash;

        await user.save();

        res.json({ message: "Password updated successfully!" });

    } catch (err) {
        res.status(400).send({ message: err.message || "Something went wrong" });
    }
});



//forgot password
profileRouter.patch("/profile/forgot-password", async (req, res) => {
    try {
        const { email, birthDate, newPassword } = req?.body;
        const user = await User.findOne({ email: email, birthDate: birthDate });
        if (!user) {
            res.json({ message: "User not found with this email and birthdate" });
        }
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        user.password = newPasswordHash;
        await user.save().then(() => {
            res.json({ message: "your password updated succesfully. Now you can login using your new password." });
        })
    } catch (err) {
        res.status(400).send(err);
    }
})


module.exports = profileRouter;