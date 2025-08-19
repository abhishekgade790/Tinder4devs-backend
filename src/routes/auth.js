const express = require('express');
const authRouter = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const validator = require('validator');
const { sendMail } = require('../utils/emailService');
const { setOtp, getOtp, deleteOtp } = require('../utils/otpCache');

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
        await sendMail(newUser.email, "Welcome to Tinder4Devs", `<h1>Hello ${newUser.firstName},</h1><p>Welcome to Tinder4Devs! We are excited to have you on board.</p>`);
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
                    secure: true, // only send cookie over HTTPS
                    sameSite: "None", // allow cross-site cookie
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
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
    });
    res.send("Logout successful...");
})

//send-otp

authRouter.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email });
        if (user) {
            return res.json({ message: "Email already registered" });
        }
        //generate a random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        //store in cache
        setOtp(email, otp);

        await sendMail(
            email,
            "Your OTP Code",
            `<h1>Your OTP Code is ${otp}</h1><p>Please use this code to verify your email. Valid for 5 minutes.</p>`
        );

        res.json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Something went wrong. Try again.");
    }
});

//verify-otp

authRouter.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    const cachedOtp = getOtp(email);
    if (!cachedOtp) {
        return res.json({ success: false, message: "OTP expired or not found" });
    }

    if (cachedOtp === otp) {
        deleteOtp(email); // clear OTP after successful verification
        return res.json({ success: true, message: "OTP verified successfully" });
    }

    return res.json({ success: false, message: "Invalid OTP" });
});

// forgot password/send-otp
authRouter.post("/forgot-password/send-otp", async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found with this email" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setOtp(email, otp);

        await sendMail(
            email,
            "Your OTP Code for Password Reset",
            `<h1>Your OTP Code is ${otp}</h1>
             <p>Please use this code to reset your password. Valid for 5 minutes.</p>`
        );

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Something went wrong. Try again." });
    }
});

// forgot password/reset (verify OTP + reset password)
authRouter.patch("/forgot-password/reset", async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const cachedOtp = getOtp(email);
        if (!cachedOtp) {
            return res.json({ success: false, message: "OTP expired or not found" });
        }

        if (cachedOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found with this email" });
        }

        if (!validator.isStrongPassword(newPassword)) {
            return res.json({
                success: false,
                message: "Password must be strong: include at least 1 uppercase, 1 lowercase, 1 number, and 1 special character."
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        user.password = newPasswordHash;
        await user.save();

        deleteOtp(email); // clear OTP after reset

        res.json({ success: true, message: "Password reset successfully. You can now log in with your new password." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Something went wrong. Try again." });
    }
});





module.exports = authRouter;