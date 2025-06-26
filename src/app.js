const express = require('express');
const connectDB = require('./config/database');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const requestRouter = require('./routes/request');  

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/', authRouter);
app.use('/', profileRouter); 
app.use('/', requestRouter);


connectDB().then((result) => {
    console.log("database connected........")
    app.listen(6057, () => {
        console.log("server is listening on port 6057.....!")
    })
}).catch((err) => {
    console.log("error to connect db....");
});


