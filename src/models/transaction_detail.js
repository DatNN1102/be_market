const mongoose = require('mongoose');
const { Schema } = mongoose;

const DetailTransactionSchema = new Schema({
  transactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  number: {
    type: Number,
    required: true,
    min: [1, 'Số lượng phải lớn hơn 0']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Giá phải lớn hơn hoặc bằng 0']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Tổng tiền phải lớn hơn hoặc bằng 0']
  }
}, {
  timestamps: true // tạo createdAt (TimeCreate) và updatedAt (TimeUpdate)
});

module.exports = mongoose.model('DetailTransaction', DetailTransactionSchema);