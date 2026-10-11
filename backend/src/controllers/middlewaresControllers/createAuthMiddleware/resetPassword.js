const bcrypt = require('bcryptjs');
const Joi = require('joi');
const mongoose = require('mongoose');
const shortid = require('shortid');

const crypto = require('node:crypto');

const resetPassword = async (req, res, { userModel }) => {
  const UserPassword = mongoose.model(userModel + 'Password');
  const User = mongoose.model(userModel);
  const { password, userId, resetToken } = req.body;

  // Validate before any account or token lookup to avoid leaking account state.
  const objectSchema = Joi.object({
    password: Joi.string().min(12).max(128).required(),
    userId: Joi.string().hex().length(24).required(),
    resetToken: Joi.string().hex().length(64).required(),
  });

  const { error } = objectSchema.validate({ password, userId, resetToken });
  if (error) {
    return res.status(409).json({
      success: false,
      result: null,
      error: error,
      message: 'Invalid reset password object',
      errorMessage: error.message,
    });
  }

  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const user = await User.findOne({ _id: userId, removed: false, enabled: true }).exec();
  const databasePassword = await UserPassword.findOne({
    user: userId,
    removed: false,
    resetToken: tokenHash,
    resetTokenExpires: { $gt: new Date() },
  }).exec();
  if (!user || !databasePassword)
    return res.status(400).json({ success: false, result: null, message: 'Reset link is invalid or expired.' });

  const salt = shortid.generate();
  const hashedPassword = bcrypt.hashSync(salt + password);
  const consumed = await UserPassword.findOneAndUpdate(
    { _id: databasePassword._id, resetToken: tokenHash, resetTokenExpires: { $gt: new Date() } },
    {
      $set: { password: hashedPassword, salt, resetToken: null, resetTokenExpires: null, loggedSessions: [] },
    },
    {
      new: true,
    }
  ).exec();
  if (!consumed)
    return res.status(400).json({ success: false, result: null, message: 'Reset link is invalid or expired.' });

  return res.status(200).json({ success: true, result: null, message: 'Password updated. Please log in.' });
};

module.exports = resetPassword;
