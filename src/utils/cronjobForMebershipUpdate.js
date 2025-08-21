const cron = require('node-cron');
const User = require('../models/user');

//run every day at 8 AM
cron.schedule('0 8 * * *', async () => {
    try {
        console.log('Running daily membership update cron:', new Date().toLocaleString());
        const result = await User.updateMany(
            {
                membershipType: { $in: ['devpro', 'codemaster'] },
                membershipEndDate: { $lte: new Date() }
            },
            {
                $set: {
                    membershipType: null,
                    membershipStartDate: null,
                    membershipEndDate: null,
                    isPremium: false
                }
            }
        );
        console.log(`Updated ${result.modifiedCount} users with expired memberships.`);
    } catch (error) {
        console.error('Error running daily membership update cron:', error);
    }
}, { scheduled: true });
