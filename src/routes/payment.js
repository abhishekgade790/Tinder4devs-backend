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

//webhook
//webhook
paymentRouter.post("payment/webhook", async (req, res) => {
  console.log('calling webhook');
  console.log(req)
  console.log("Received webhook request:", req.headers);
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const durationMapping = { "1": 30, "3": 90, "6": 180 };

    let iswebhookValid;
    try {
        iswebhookValid = validateWebhookSignature(JSON.stringify(req.body), signature, webhookSecret);
    } catch (error) {
        console.log("Webhook verification failed:", error);
        return res.status(400).send("Invalid signature",error);
    }
    if (!iswebhookValid) {
        return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    const paymentDetails = req.body.payload.payment.entity;

    if (event === "payment.captured") {
        try {
            // Update the payment status in the database
            const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
            if (!payment) {
                console.error("Payment not found for orderId:", paymentDetails.order_id);
                return res.status(404).send("Payment not found");
            }
            payment.status = paymentDetails.status;
            await payment.save();

            // Update user membership details
            const user = await User.findById(payment.userId);
            if (user) {
                user.membershipType = payment.membershipType;
                user.membershipStartDate = new Date();
                const durationInDays = durationMapping[payment.duration];
                user.membershipEndDate = new Date(Date.now() + durationInDays * 24 * 60 * 60 * 1000);
                user.isPremium = true;
                await user.save();
            }

            console.log("✅ Membership updated successfully for user:", user?._id);
        } catch (error) {
            console.error("Error processing webhook:", error);
            return res.status(500).send("Error processing webhook");
        }
    }

    // Always acknowledge webhook quickly
    res.status(200).send("Webhook received");
});

module.exports = paymentRouter;