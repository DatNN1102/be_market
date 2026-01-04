const mongoose = require('mongoose');
const { Schema } = mongoose;

const TransactionSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  phone: {
    type: String,
    required: true,
    match: [/^\d{9,11}$/, 'Số điện thoại không hợp lệ']
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'Email không hợp lệ']
  },
  paymentMethod: {
    type: String,
    required: true,
    trim: true
  },
  isPaid: {
    type: Boolean,
    default: false // true: đã thanh toán, false: chưa thanh toán
  },
  status: {
    type: Number,
    default: 1 // 1: đang xử lý, 0: huỷ, 2: hoàn tất
  },
  isShow: {
    type: Boolean,
    default: true
  },
  note: {
    type: String,
    trim: true
  },
  totalPrice: {
    type: Number,
    required: true
  }
}, {
  timestamps: true // tự động tạo createdAt và updatedAt
});

module.exports = mongoose.model('Transaction', TransactionSchema);