const RazorPay = require("razorpay");
const dotenv = require('dotenv');
dotenv.config();

var instance = new RazorPay({
    key_id: process.env.RAZORPAY_KEY_ID, // Enter the Key ID generated
    key_secret: process.env.RAZORPAY_KEY_SECRET // Enter the Key Secret generated
});

console.log("RazorPay instance created with key ID:", process.env.RAZORPAY_KEY_ID);
console.log("RazorPay instance created with key secret:", process.env.RAZORPAY_KEY_SECRET);

module.exports = instance;