const express = require('express')
const app = express()


app.use("/hello", (req, res) => {
    res.send("hello from server....!")
})
app.use("/test", (req, res) => {
    res.send("test from server....!")
})
app.use("/abhi", (req, res) => {
    res.send("abhi is here at server to serve requests from user....!")
})
app.use((req, res) => {
    res.send("Wellcome to the server....!")
})

app.listen(6057, () => {
    console.log("server is listening on port 6057.....!")
})