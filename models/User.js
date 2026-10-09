const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'executive', 'admin'],
      default: 'executive',
    },
    executiveId: {
      type: String,
      default: function () {
        return 'EX-' + Math.floor(100 + Math.random() * 900);
      },
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
