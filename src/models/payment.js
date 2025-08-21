const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    orderId: {
        type: String,
        required: true
    },
    membershipType: {
        type: String,
        enum: ['devpro', 'codemaster'],
        required: true
    },
    duration: {
        type: String,
        enum: ['1', '3', '6'], // 1 month, 3 months, 6 months
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
    },
    currency: {
        type: String,
        default: 'INR'
    },
    receipt: {
        type: String,
        default: `receipt_${Date.now()}`
    },
    notes: {
        firstName: String,
        lastName: String,
        email: String,
        membershipType: String,
        duration: {
            type: String,
            enum: ['1', '3', '6'], // 1 month, 3 months, 6 months
            required: true
        }
    }

}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;