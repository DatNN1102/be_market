const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  realPrice: {
    type: Number,
    required: true
  },
  promotionalPrice: {
    type: Number,
    required: false,
    default: 0
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  sensorValve: {
    type: String,
    required: false,
    trim: true
  },
  feature :{
    type: String,
    required: false
  },
  detail: {
    type: String,
    required: false,
    trim: true
  },
  status: {
    type: Number,
    default: 1 // 1: active/show, 0: inactive/hide
  },
  quantity: {
    type: Number,
    default: 0
  },
  images: {
    type: String, // chuỗi chứa tên các file ảnh, phân cách bằng dấu phẩy
    default: ''
  },
  warrantyPeriod: {
    type: String, // ví dụ: "12 tháng", "24 tháng"
    required: false,
    trim: true
  }
}, {
  timestamps: true // tự động thêm: createdAt, updatedAt
});

module.exports = mongoose.model('Product', ProductSchema);
