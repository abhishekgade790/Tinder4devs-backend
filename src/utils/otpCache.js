// otpCache.js
const otpCache = new Map();

// TTL: auto delete OTP after 5 minutes
function setOtp(email, otp) {
  otpCache.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
}

function getOtp(email) {
  const data = otpCache.get(email);
  if (!data) return null;

  if (Date.now() > data.expiresAt) {
    otpCache.delete(email); // expired
    return null;
  }
  return data.otp;
}

function deleteOtp(email) {
  otpCache.delete(email);
}

module.exports = { setOtp, getOtp, deleteOtp };
