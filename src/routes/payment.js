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
paymentRouter.post("/payment/webhook", async (req, res) => {
  try {
    console.log("🔔 Webhook called");
    console.log("📩 Headers:", req.headers);

    const signature = req.get("X-Razorpay-Signature"); // cleaner + case-insensitive
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    console.log("📌 Signature:", signature);

    const isWebhookValid = validateWebhookSignature(
      JSON.stringify(req.body),
      signature,
      webhookSecret
    );

    if (!isWebhookValid) {
      console.log("❌ Invalid webhook signature");
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    console.log("✅ Webhook signature is valid");

    const paymentDetails = req.body.payload.payment.entity;

    // Update DB when payment captured
    const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
    if (!payment) {
      console.log("❌ Payment not found for orderId:", paymentDetails.order_id);
      return res.status(404).json({ message: "Payment not found" });
    }

    payment.status = paymentDetails.status;
    await payment.save();
    console.log("💰 Payment status updated:", payment);

    const durationMapping = { "1": 30, "3": 90, "6": 180 };
    const user = await User.findById(payment.userId);

    if (user) {
      user.membershipType = payment.membershipType;
      user.membershipStartDate = new Date();
      user.membershipEndDate = new Date(
        Date.now() + durationMapping[payment.duration] * 24 * 60 * 60 * 1000
      );
      user.isPremium = true;
      await user.save();
      console.log("👑 Membership updated for user:", user._id);
    }

    return res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.log("❌ Error processing webhook:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


module.exports = paymentRouter;