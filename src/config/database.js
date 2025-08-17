const mongoose = require('mongoose');

const connectDB = async () => {
    console.log("Connecting to database...",process.env.DATABASE_STRING);
    await mongoose.connect(process.env.DATABASE_STRING, {
        useNewUrlParser: true
    })
}


module.exports = connectDB;