const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect(process.env.DATABASE_STRING, {
        useNewUrlParser: true
    })
}


module.exports = connectDB;