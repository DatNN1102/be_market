const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const DetailTransaction = require('../models/transaction_detail');
const verifyToken = require('../middleware/verifyToken');
const axios = require('axios');
const Product = require('../models/products');

// Hàm tạo mã ngẫu nhiên
function generateCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'DUY' + result; // Ví dụ: TX8F9K2L
}

// Hàm sinh mã không trùng
async function generateUniqueCode() {
  let code;
  let exists = true;

  while (exists) {
    code = generateCode();
    const existing = await Transaction.findOne({ code });
    if (!existing) exists = false;
  }

  return code;
}

// 📌 GET all transactions (filter by email, paging)
router.get('/', async (req, res) => {
  try {
    const {
      code = '',
      page = 1,
      limit = 10
    } = req.query;

    const query = {
      code: { $regex: code, $options: 'i' }
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user._id;
    const query = { userId };
    const transactions = await Transaction.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .populate({ path: 'userId', select: 'fullName' });
    const total = await Transaction.countDocuments(query);
    res.status(200).json({
      success: true,
      data: transactions.map(tx => ({
        ...tx.toObject(),
        fullName: tx.userId?.fullName || null
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ.',
      error: error.message
    });
  }
});

router.get('/:code', async (req, res) => {
  try {
    // Tìm giao dịch theo mã code và populate tên người dùng
    const transaction = await Transaction.findOne({ code: req.params.code })
      .populate({ path: 'userId', select: 'fullName' })
      .lean();

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch.' });
    }

    // Lấy chi tiết và populate sản phẩm
    const details = await DetailTransaction.find({ transactionId: transaction._id })
      .populate({ path: 'productId', select: 'name images warrantyPeriod' })
      .lean();

    // Format lại details
    const formattedDetails = details.map(detail => ({
      _id: detail._id,
      productId: detail.productId?._id,
      productName: detail.productId?.name,
      productImages: detail.productId?.images,
      productWarrantyPeriod: detail.productId?.warrantyPeriod,
      number: detail.number,
      unitPrice: detail.unitPrice,
      totalPrice: detail.totalPrice,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt
    }));

    // Gán details vào transaction
    transaction.details = formattedDetails;

    // Gán thêm tên người dùng vào transaction
    transaction.userName = transaction.userId?.fullName || 'Ẩn danh';
    delete transaction.userId; // nếu không muốn trả lại userId gốc

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

// 📌 Tạo mới giao dịch
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      phone,
      address,
      email,
      note,
      paymentMethod,
      totalPrice,
      status,
      isShow,
      details
    } = req.body;

    const userId = req.user?._id || req.body.userId || null;

    if (
      !phone ||
      !address ||
      !email ||
      !paymentMethod ||
      totalPrice == null ||
      !Array.isArray(details) ||
      details.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc hoặc danh sách sản phẩm rỗng.'
      });
    }

    for (const item of details) {
      // Lấy sản phẩm từ DB để kiểm tra tồn kho
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Sản phẩm với ID ${item.productId} không tồn tại.`
        });
      }

      // So sánh số lượng đặt với tồn kho
      if (item.number > product.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" chỉ còn ${product.quantity} cái trong kho, không đủ để đặt ${item.number}.`
        });
      }
    }

    const code = await generateUniqueCode();

    const newTransaction = new Transaction({
      code,
      userId,
      phone,
      address,
      email,
      paymentMethod,
      note,
      totalPrice,
      status,
      isShow,
      isPaid: false, // Mặc định chưa thanh toán
    });

    await newTransaction.save();

    for (const item of details) {
      const detail = new DetailTransaction({
        transactionId: newTransaction._id,
        productId: item.productId,
        number: item.number,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      });
      await detail.save();
    }

    // Nếu phương thức là VNPay thì gọi API tạo thanh toán
    if (paymentMethod === 'vnpay') {

      const response = await axios.post(
        `${process.env.BACKEND_URL || 'http://localhost:3000'}/vnp/create_payment`,
        { amount: totalPrice, orderCode: code },
        {
          params: {
            bankCode: req.query.bankCode || '',
            language: req.query.language || 'vn'
          },
          headers: {
            'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket.remoteAddress
          }
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Chuyển hướng đến cổng thanh toán VNPay.',
        paymentUrl: response.data.url
      });
    }

    // Nếu không phải VNPay thì trả về kết quả giao dịch như cũ
    res.status(201).json({
      success: true,
      message: 'Tạo giao dịch và chi tiết thành công.',
      data: newTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ.',
      error: error.message
    });
  }
});

// 📌 UPDATE transaction
router.put('/:id', async (req, res) => {
  try {
    const updated = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    console.log('updated', updated);

    if (!updated)
      return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch để cập nhật.' });

    res.status(200).json({ success: true, message: 'Cập nhật thành công.', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

// 📌 DELETE transaction
// 📌 Ẩn giao dịch (không xoá thật mà chỉ cập nhật isShow = false)
router.delete('/:id', async (req, res) => {
  try {
    const updated = await Transaction.findByIdAndUpdate(
      req.params.id,
      { isShow: false },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch để xóa.' });
    }

    res.status(200).json({ success: true, message: 'Xóa giao dịch thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});


module.exports = router;
