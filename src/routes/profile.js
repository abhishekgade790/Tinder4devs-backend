const express = require('express');
const userAuth = require('../middlewares/auth');
const profileRouter = express.Router();
const { isEditProfileValid } = require('../utils/validation')
const bcrypt = require('bcrypt');
const User = require('../models/User');


//profile/view
profileRouter.get("/profile/view", userAuth, async (req, res) => {
    try {
        const user = req.user;
        res.json(user);
    } catch (err) {
        res.status(400).send( err);

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
        res.status(400).send( err);
    }
});

//update password 
profileRouter.patch("/profile/update-password", userAuth, async (req, res) => {
    try {
        const user = req.user;
        const passwordHash = user.password;
        const { confirmPassword, newPassword } = req?.body;

        const isPasswordMatch = bcrypt.compare(confirmPassword, passwordHash);

        if (!isPasswordMatch) {
            throw new Error('password does not match.')
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        user.password = newPasswordHash;

        await user.save().then(() => {
            res.send("password updated succesfully..!")
        })

    } catch (err) {
        res.status(400).send( err)
    }
})

//forgot password
profileRouter.patch("/profile/forgot-password", async (req, res) => {
    try {
        const { email, birthDate, newPassword } = req?.body;
        const user = await User.findOne({ email: email, birthDate: birthDate });
        if (!user) {
            throw new Error("User not found with this email and birthdate");
        }
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        user.password = newPasswordHash;
        await user.save().then(() => {
            res.send("your password updated succesfully. Now you can login using your new password.");
        })
    } catch (err) {
        res.status(400).send( err);
    }
})


module.exports = profileRouter;