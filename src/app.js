const express = require('express');
const connectDB = require('./config/database');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const requestRouter = require('./routes/request');
const userRouter = require('./routes/user');
const cors = require('cors')

const app = express();

app.use(cors({
    origin: ["http://localhost:5173", "https://tinder4devs.vercel.app"],
    credentials: true
}))
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1); // required if behind proxy like Render


app.use('/', authRouter);
app.use('/', profileRouter);
app.use('/', requestRouter);
app.use('/', userRouter)


connectDB().then((result) => {
    console.log("database connected........")
    app.listen(6057, () => {
        console.log("server is listening on port 6057.....!")
    })
}).catch((err) => {
    console.log("error to connect db....");
});


