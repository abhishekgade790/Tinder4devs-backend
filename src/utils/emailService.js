const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
        user: "94c079001@smtp-brevo.com",
        pass: "9tKnkS1v8sqhRFYW",
    },
});

async function sendMail(to, subject, text) {
    const info = await transporter.sendMail({
        from: '"Tinder4Devs" <45abcreations@gmail.com>',
        to,
        subject,
        text,
    });

    console.log("Message sent:", info);
    return info;
}

module.exports = { sendMail };
