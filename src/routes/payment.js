// src/routes/payment.js
const express = require("express");
const crypto = require("crypto");
const paymentRouter = express.Router();

const instance = require("../config/razorpay");
const userAuth = require("../middlewares/auth");
const Payment = require("../models/payment");
const User = require("../models/user");
const { membershipAmount } = require("../utils/constant");
const {
  validateWebhookSignature,
  validatePaymentVerification,
} = require("razorpay/dist/utils/razorpay-utils");

/**
 * Utility: add n days to now
 */
const addDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const durationMapping = { "1": 30, "3": 90, "6": 180 };

/**
 * Create a new order
 */
paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  const { membershipType, duration } = req.body;
  console.log("🧾 /payment/create ::", { membershipType, duration, user: req.user?._id });

  const plan = membershipAmount[membershipType];
  if (!plan || !plan[duration]) {
    console.log("❌ Invalid membership or duration");
    return res
      .status(400)
      .json({ success: false, message: "Invalid membership type or duration" });
  }

  const totalAmount = plan[duration];

  try {
    const options = {
      amount: totalAmount * 100, // paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        membershipType,
        duration,
      },
    };

    const order = await instance.orders.create(options);
    console.log("✅ Razorpay order created:", order.id);

    // Persist order to DB
    const payment = await Payment.create({
      userId: req.user._id,
      orderId: order.id,
      membershipType,
      duration,
      amount: order.amount,
      status: order.status, // usually 'created'
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
    });

    return res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      payment, // includes orderId etc.
    });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create order" });
  }
});

/**
 * Verify (client callback) — called from Razorpay Checkout handler on success
 * Body expected: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
 */
paymentRouter.post("/payment/verify", userAuth, async (req, res) => {
  console.log("🧾 /payment/verify :: body =", req.body);

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    console.log("❌ Missing verify fields");
    return res.status(400).json({ success: false, message: "Bad request" });
  }

  try {
    // Signature check
    const ok = validatePaymentVerification(
      { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    console.log("🔑 Client-side signature valid:", ok);

    if (!ok) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // Update Payment doc idempotently
    const payment = await Payment.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        $set: {
          status: "captured", // optimistic (webhook will confirm final state)
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
      },
      { new: true }
    );

    if (!payment) {
      console.log("❌ Payment doc not found for order:", razorpay_order_id);
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    // Optimistically activate membership (webhook will also do same safely)
    const user = await User.findById(payment.userId);
    if (user) {
      const days = durationMapping[payment.duration];
      user.membershipType = payment.membershipType;
      user.membershipStartDate = new Date();
      user.membershipEndDate = addDays(days);
      user.isPremium = true;
      await user.save();
      console.log("✅ Membership activated via /verify for user:", user._id);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("❌ /payment/verify error:", error);
    return res.status(500).json({ success: false, message: "Verify failed" });
  }
});

/**
 * Webhook (server→server) — must use RAW BODY for signature verification
 * IMPORTANT: this route MUST receive `express.raw({ type: 'application/json' })`
 * Either attach on the router here (as below) or mount in app.js specifically for this path.
 */
paymentRouter.post(
  "/payment/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("🔔 Webhook received");

    // Razorpay sends header in lowercase (Express normalizes)
    const signature = req.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    console.log("📩 Header x-razorpay-signature:", signature || "❌ missing");
    console.log("🔐 Webhook secret present:", webhookSecret ? "✅" : "❌");

    if (!signature || !webhookSecret) {
      return res.status(400).send("Invalid signature header or missing secret");
    }

    // IMPORTANT: req.body is a Buffer because of express.raw
    const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : "";
    if (!rawBody) {
      console.log("❌ Empty raw body");
      return res.status(400).send("Bad Request");
    }

    let valid = false;
    try {
      valid = validateWebhookSignature(rawBody, signature, webhookSecret);
      console.log("🔑 Webhook signature valid:", valid);
    } catch (e) {
      console.error("❌ validateWebhookSignature error:", e);
      return res.status(400).send("Invalid signature");
    }

    if (!valid) return res.status(400).send("Invalid signature");

    // Acknowledge ASAP
    res.status(200).send("OK");

    // Parse JSON safely AFTER responding (we already validated sig on raw body)
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return console.error("❌ JSON parse error (raw body was valid for sig):", e);
    }

    const event = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity;
    console.log("📌 Event:", event);
    console.log("💰 Payment entity order_id:", paymentEntity?.order_id);

    if (!paymentEntity?.order_id) return;

    try {
      // Upsert payment doc (idempotent)
      const payment = await Payment.findOneAndUpdate(
        { orderId: paymentEntity.order_id },
        {
          $set: {
            status: paymentEntity.status, // 'captured' etc
            razorpayPaymentId: paymentEntity.id,
          },
        },
        { new: true }
      );

      if (!payment) {
        return console.warn("⚠️ Payment doc not found for webhook order:", paymentEntity.order_id);
      }

      // Only activate membership on captured
      if (event === "payment.captured" || paymentEntity.status === "captured") {
        const user = await User.findById(payment.userId);
        if (!user) return console.warn("⚠️ User not found for payment:", payment.userId);

        const days = durationMapping[payment.duration];
        user.membershipType = payment.membershipType;
        user.membershipStartDate = new Date();
        user.membershipEndDate = addDays(days);
        user.isPremium = true;
        await user.save();

        console.log("✅ Membership activated via webhook for user:", user._id);
      }
    } catch (err) {
      console.error("❌ Webhook post-processing error:", err);
    }
  }
);

module.exports = paymentRouter;
