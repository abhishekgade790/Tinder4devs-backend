const express = require("express");
const paymentRouter = express.Router();
const instance = require("../config/razorpay");
const userAuth = require("../middlewares/auth");
const Payment = require("../models/payment");
const { membershipAmount } = require("../utils/constant");
const { validateWebhookSignature } = require("razorpay/dist/utils/razorpay-utils");
const User = require("../models/user");



// Create a new order
paymentRouter.post("/payment/create", userAuth, async (req, res) => {
    const { membershipType, duration } = req.body;
    console.log("Received membershipType:", membershipType);
    console.log("Received duration:", duration);
    const validMembership = membershipAmount[membershipType];
    if (!validMembership || !validMembership[duration]) {
        return res.status(400).json({ success: false, message: "Invalid membership type or duration" });
    }

    const totalAmount = validMembership[duration];
    try {
        const options = {
            amount: totalAmount * 100,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                email: req.user.email,
                membershipType,
                duration
            }
        };

        const order = await instance.orders.create(options);
        //save order details to the database 
        const paymentData = {
            userId: req.user._id,
            orderId: order.id,
            membershipType,
            duration,
            amount: order.amount,
            status: order.status,
            currency: order.currency,
            receipt: order.receipt,
            notes: order.notes
        };
        const payment = new Payment(paymentData);
        const savePayment = await payment.save();


        //send response back to frontend
        res.json({ success: true, payment: savePayment, key: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error("Error creating order:", error);
        res.json({ success: false, message: "Failed to create order" });
    }
});



paymentRouter.post("/payment/webhook", async (req, res) => {
    console.log("🔔 Webhook received");

    const signature = req.get("X-Razorpay-Signature");
    console.log( req.headers)

    if (!signature) {
        console.error("❌ Razorpay signature missing in webhook headers!");
        return res.status(400).json({ error: "Invalid webhook signature" });
    }
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    console.log("📩 Headers Signature:", signature);
    console.log("📩 Webhook Secret from env:", webhookSecret ? "Loaded ✅" : "❌ Missing");

    let isWebhookValid = false;
    try {

        isWebhookValid = validateWebhookSignature(
            JSON.stringify(req.body),
            signature,
            webhookSecret
        );
        console.log("🔑 Signature valid:", isWebhookValid);
    } catch (error) {
        console.error("❌ Webhook verification failed:", error);
        return res.status(400).send("Invalid signature");
    }

    if (!isWebhookValid) {
        console.error("❌ Invalid webhook signature");
        return res.status(400).send("Invalid signature");
    }


    try {
        const paymentDetails = req.body.payload?.payment?.entity;
        console.log("💰 Payment Details:", paymentDetails);

        const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
        console.log("🔎 DB Payment found:", payment ? "Yes ✅" : "No ❌");

        if (!payment) {
            return res.status(404).send("Payment not found");
        }

        // Update payment
        payment.status = paymentDetails.status;
        await payment.save();
        console.log("💾 Payment updated in DB");

        // Update user
        const user = await User.findById(payment.userId);
        console.log("👤 User found:", user ? user._id : "❌ No user");

        if (user) {
            const durationMapping = { "1": 30, "3": 90, "6": 180 };
            const durationInDays = durationMapping[payment.duration];

            user.membershipType = payment.membershipType;
            user.membershipStartDate = new Date();
            user.membershipEndDate = new Date(Date.now() + durationInDays * 24 * 60 * 60 * 1000);
            user.isPremium = true;

            await user.save();
            console.log("✅ Membership updated successfully for user:", user._id);
        }

    } catch (error) {
        console.error("❌ Error processing webhook:", error);
        return res.status(500).send("Error processing webhook");
    }

    res.status(200).send("Webhook received ✅");
});

module.exports = paymentRouter;