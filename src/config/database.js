const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect('mongodb+srv://abhishekgade790:YGev59FnhmNXyymx@cluster45.8ctjyzx.mongodb.net/tinder4devs')
}


module.exports = connectDB;