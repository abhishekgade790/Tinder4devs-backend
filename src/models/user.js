const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        minLength: 3,
        maxLength: 50,
        validate(value) {
            if (!validator.isAlpha(value)) {
                throw new Error('First name must be alphabetic');
            }
        }
    },
    lastName: {
        type: String,
        trim: true,
        validate(value) {
            if (!validator.isAlpha(value)) {
                throw new Error('Last name must be alphabetic');
            }
        }
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Invalid email');
            }
        }
    },
    password: {
        type: String,
        required: true,
    },
    birthDate: {
        type: Date,
        required: true,
        validate(value) {
            if (!value || isNaN(Date.parse(value))) {
                throw new Error("Invalid birth date");
            }

            const today = new Date();
            const birthDate = new Date(value);
            const ageDiff = today.getFullYear() - birthDate.getFullYear();
            const hasBirthdayPassedThisYear =
                today.getMonth() > birthDate.getMonth() ||
                (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

            const age = hasBirthdayPassedThisYear ? ageDiff : ageDiff - 1;

            if (age < 18) {
                throw new Error("You must be at least 18 years old.");
            }
        }
    }

    ,
    age: {
        type: Number,
        min: 18
    },
    gender: {
        type: String,
        validate(value) {
            if (!['male', 'female', 'other'].includes(value)) {
                throw new Error('Invalid gender: Please enter male, female or other');
            }
        }
    },
    skills: {
        type: [String],
        default: [],
        validate(value) {
            if (!Array.isArray(value)) {
                throw new Error("Skills must be an array");
            }
            if (value.length > 10) {
                throw new Error("You can add up to 10 skills only");
            }
        }
    },
    photoUrl: {
        type: String,
        default: "https://tse3.mm.bing.net/th/id/OIP.c2pNCKarFMQqCgZG7L5YNwHaHa?pid=Api&P=0&h=180",
    },
    about: {
        type: String,
        default: "This is default about of user",
        trim: true
    }
}, {
    timestamps: true
});

userSchema.index({ firstName: 1, lastName: 1 })

userSchema.pre('save', function (next) {
    if (this.birthDate) {
        const today = new Date();
        const birthDate = new Date(this.birthDate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        this.age = age;
    }
    next();
});

userSchema.methods.getJwtToken = async function () {
    const user = this;
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return token;
}

userSchema.methods.validatePassword = async function (passwordInput) {
    const user = this;
    const passwordHash = user.password;
    const isPasswordValid = await bcrypt.compare(passwordInput, passwordHash);
    return isPasswordValid;
}
const User = mongoose.model('User', userSchema);
module.exports = User;