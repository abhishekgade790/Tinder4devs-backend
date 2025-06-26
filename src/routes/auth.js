const express = require('express');
const authRouter = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

//sign-up 
authRouter.post("/signup", async (req, res) => {
    const { firstName, lastName, email, password,birthDate, age, gender,skills, photoUrl, about } = req?.body
    //validation -> schema level validation

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
        res.send("User added successfully....");
    } catch (err) {
        res.send("ERROR : " + err);
    }
})

//login
authRouter.post("/login", async (req, res) => {
    const { email, password } = req?.body;
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            res.status(404).send("Invalid credentials");
        } else {
            const isPasswordValid = user.validatePassword(password);
            const token = await user.getJwtToken();
            if (isPasswordValid) {
                res.cookie("token", token, { expires: new Date(Date.now() + 7 * 60 * 60 * 24) });
                res.send("Login successful...");
            } else {
                res.send("Invalid credentials");
            }
        }
    } catch (err) {
        res.status(404).send("ERROR : " + err);
    }
})

//logout

authRouter.post("/logout", async (req, res) => {
    res.clearCookie("token");
    res.send("Logout successful...");
})


module.exports = authRouter;