const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  fullName: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'Email không hợp lệ'],
  },
  phone: {
    type: String,
    required: false,
    match: [/^\d{9,11}$/, 'Số điện thoại không hợp lệ'], // tuỳ định dạng bạn muốn
  },
  address: {
    type: String,
    required: false,
    trim: true,
  },
  status: {
    type: Number,
    default: 1, // 1: active, 0: inactive
  },
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

module.exports = mongoose.model('User', UserSchema);