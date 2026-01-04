const mongoose = require('mongoose');
const { Schema } = mongoose;

const WarrantySchema = new Schema({
   userID: {
    type: String,
    required: true,
    trim: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  numberProduct: {
    type: Number,
    required: false,
  },
  serialNumber: {
    type: String,
    required: false,
    trim: true
  },
  purchaseDate: {
    type: String,
    required: false
  },
  warrantyPeriod: {
    type: String, // ví dụ: "12 tháng" hoặc có thể đổi sang Number (số tháng) nếu cần tính toán
    required: false
  },
  warrantyExpiryDate: {
    type: String,
    required: false
  },
  customerName: {
    type: String,
    required: false,
    trim: true
  },
  phone: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: false, // có thể không bắt buộc nếu bạn muốn đơn giản
    trim: true
  },
  address: {
    type: String,
    required: false,
    trim: true
  },
  customerNotes: {
    type: String,
    required: false
  },
  warrantyCode: {
    type: String,
    required: false,
    // unique: true,
    trim: true
  },
  issueDescription: {
    type: String,
    required: false
  },
  receivedDate: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['Đang xử lý', 'Đã hoàn thành', 'Từ chối'],
    default: 'Đang xử lý'
  },
  processingStaff: {
    type: String, // có thể lưu tên nhân viên xử lý
    required: false
  },
  warrantyResult: {
    type: String,
    required: false // ghi nhận kết quả sửa chữa, đổi mới,...
  },
  returnDate: {
    type: String,
    required: false
  },
  staffNotes: {
    type: String,
    required: false
  }
}, {
  timestamps: {
    createdAt: 'TimeCreate',
    updatedAt: 'TimeUpdate'
  }
});

module.exports = mongoose.model('Warranty', WarrantySchema);