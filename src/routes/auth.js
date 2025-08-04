const express = require('express');
const authRouter = express.Router();
const User = require('../models/../models/User');
const bcrypt = require('bcrypt');
const validator = require('validator');

//sign-up 
authRouter.post("/signup", async (req, res) => {
    const { firstName, lastName, email, password, birthDate, age, gender, skills, photoUrl, about } = req?.body
    //validation -> schema level validation

    //email exist or not
    const user = await User.findOne({ email: email });
    if (user) {
        return res.json({ message: "Email already exists." });
    }
    //password validation
    if (!validator.isStrongPassword(password)) {
        return res.json({ message: "Password must be strong: It must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character" });
    }

    //Password encryption
    const passwordHash = await bcrypt.hash(password, 10)


    const newUser = new User({
        firstName,
        lastName,
        email,
        password: passwordHash,
        birthDate,
        age,
        gender,
        skills,
        photoUrl,
        about,
    })
    try {
        await newUser.save()
        res.json({ message: "success", data: newUser });
    } catch (err) {
        res.json({ message: "failed", err: err });
    }
})

//login
authRouter.post("/login", async (req, res) => {
    const { email, password } = req?.body;
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            res.status(401).send("Invalid credentials");
        } else {
            const isPasswordValid = await user.validatePassword(password);
            const token = await user.getJwtToken();
            if (isPasswordValid) {
                res.cookie("token", token, {
                    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    httpOnly: true,
                });
                res.send(user);
            } else {
                return res.status(401).send("Invalid credentials");
            }
        }
    } catch (err) {
        return res.status(500).send("Something went wrong. Try again.");
    }
})

//logout

authRouter.post("/logout", async (req, res) => {
    res.clearCookie("token");
    res.send("Logout successful...");
})


module.exports = authRouter;