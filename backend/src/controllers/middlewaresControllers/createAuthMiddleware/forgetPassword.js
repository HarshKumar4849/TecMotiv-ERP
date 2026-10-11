const Joi = require('joi');

const mongoose = require('mongoose');

const checkAndCorrectURL = require('./checkAndCorrectURL');
const sendMail = require('./sendMail');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const randomBytes = promisify(crypto.randomBytes);
const { useAppSettings } = require('../../../settings');

const forgetPassword = async (req, res, { userModel }) => {
  const UserPassword = mongoose.model(userModel + 'Password');
  const User = mongoose.model(userModel);
  const { email } = req.body;

  // validate
  const objectSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
  });

  const { error } = objectSchema.validate({ email });
  if (error) {
    return res.status(409).json({
      success: false,
      result: null,
      error: error,
      message: 'Invalid email.',
      errorMessage: error.message,
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, removed: false });
  if (user?.enabled) {
    const rawToken = (await randomBytes(32)).toString('hex');
    const resetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const updated = await UserPassword.findOneAndUpdate(
      { user: user._id, removed: false },
      { $set: { resetToken, resetTokenExpires: expiresAt } },
      { new: true }
    ).exec();
    if (updated) {
      const settings = useAppSettings();
      const idurar_app_email = settings['idurar_app_email'];
      const idurar_base_url = settings['idurar_base_url'];
      const configuredClientUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL)?.split(',')[0].trim();
      const url = checkAndCorrectURL(configuredClientUrl || idurar_base_url || 'http://localhost:3000');
      const link = url + '/resetpassword/' + user._id + '/' + rawToken;

      try {
        await sendMail({
          email: normalizedEmail,
          name: user.name,
          link,
          subject: 'Reset your password | TecMotiv ERP',
          idurar_app_email,
          type: 'passwordVerfication',
        });
      } catch (mailErr) {
        console.error('Password reset email failed to send:', mailErr.message);
        // Keep the public response identical when the delivery provider fails.
      }
    }
  }

  return res.status(200).json({
    success: true,
    result: null,
    message: 'If an account exists for that email, you will receive password reset instructions shortly.',
  });
};

module.exports = forgetPassword;
