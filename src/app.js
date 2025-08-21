const express = require('express');
const connectDB = require('./config/database');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const requestRouter = require('./routes/request');
const userRouter = require('./routes/user');
const paymentRouter = require('./routes/payment');
const cors = require('cors');


require('dotenv').config();
require('./utils/cronjobForSendEmail'); 
require('./utils/cronjobForMebershipUpdate'); 


const app = express();

app.use(cors({
    origin: [process.env.TINDER_4_DEVS_FRONTEND, process.env.TINDER_4_DEVS_LOCALHOST],
    credentials: true
}))
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1); // required if behind proxy like Render


app.use('/', authRouter);
app.use('/', profileRouter);
app.use('/', requestRouter);
app.use('/', userRouter)
app.use('/', paymentRouter)


connectDB().then((result) => {
    console.log("database connected........")
    app.listen(process.env.PORT, () => {
        console.log(`server is listening on port ${process.env.PORT}.....!`)
    })
}).catch((err) => {
    console.log("error to connect db....", err);
});


