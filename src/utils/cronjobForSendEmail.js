const cron = require('node-cron');
const { startOfWeek, endOfWeek, subWeeks } = require('date-fns');
const ConnectionRequest = require('../models/connectionRequest');
const sendMail = require('./emailService'); 

cron.schedule('0 8 * * 1', async () => {
    try {
        console.log('Running weekly summary cron:', new Date().toLocaleString());

        // Get last week's Monday-Sunday range
        const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }); // last Monday 00:00
        const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });     // last Sunday 23:59

        const pendingRequests = await ConnectionRequest.find({
            status: 'interested',
            createdAt: {
                $gte: lastWeekStart,
                $lte: lastWeekEnd
            }
        }).populate('fromUserId toUserId');

        // Group requests by recipient
        const userRequestsMap = {};
        for (const req of pendingRequests) {
            const email = req.toUserId.email;
            if (!userRequestsMap[email]) {
                userRequestsMap[email] = [];
            }
            userRequestsMap[email].push(req.fromUserId.firstName);
        }

        // Send emails
        for (const [email, senders] of Object.entries(userRequestsMap)) {
            const count = senders.length;
            const uniqueSenders = [...new Set(senders)];
            const sampleSenders = uniqueSenders.slice(0, 3).join(', ');
            const moreText = uniqueSenders.length > 3 ? ' and others' : '';

            const message = `
                <p>Hello,</p>
                <p>You have <b>${count}</b> pending connection request(s) from last week (Mon-Sun).</p>
                <p>Some of them are from: <b>${sampleSenders}${moreText}</b>.</p>
                <p>Visit <a href="https://tinder4devs.vercel.app">your dashboard</a> to view and respond.</p>
                <p>Best regards,<br/>Your Team</p>
            `;

            console.log(`Sending weekly summary email to: ${email}`);
            await sendMail(email, 'Weekly Connection Summary', message);
        }

    } catch (error) {
        console.error('Error running weekly cron job:', error);
    }
}, {
    scheduled: true,
});
