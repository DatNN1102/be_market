const express = require('express');
const router = express.Router();
const Evaluate = require('../models/evaluate');
const Product = require('../models/products');

// 📌 GET đánh giá theo productID
router.get('/product/:productId', async (req, res) => {
  try {
    const evaluates = await Evaluate.find({ productID: req.params.productId, isShow: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: evaluates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

// 📌 GET tất cả đánh giá
router.get('/', async (req, res) => {
  try {
    const {
      starRating,
      isShow,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    // Lọc theo starRating
    if (starRating !== undefined) {
      query.starRating = parseInt(starRating);
    }

    // Lọc theo isShow
    if (isShow !== undefined) {
      query.isShow = isShow === 'true'; // vì query trả về chuỗi
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const evaluations = await Evaluate.find(query)
      .populate('productID', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Evaluate.countDocuments(query);

    res.status(200).json({
      success: true,
      data: evaluations,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});


// 📌 POST tạo đánh giá
router.post('/', async (req, res) => {
  const { productID, fullName, phone, email, contentEvaluate, starRating } = req.body;

  if (!productID || !fullName || !phone || !email || !contentEvaluate || starRating == null) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });
  }

  try {
    const productExists = await Product.findById(productID);
    if (!productExists) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
    }

    const newEvaluate = new Evaluate({
      productID,
      fullName,
      phone,
      email,
      contentEvaluate,
      starRating
    });

    await newEvaluate.save();
    res.status(201).json({ success: true, message: 'Đánh giá đã được thêm.', data: newEvaluate });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updateFields = req.body;

  try {
    const evaluate = await Evaluate.findById(id);
    if (!evaluate) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
    }

    // Nếu gửi productID thì kiểm tra sản phẩm tồn tại
    if (updateFields.productID) {
      const productExists = await Product.findById(updateFields.productID);
      if (!productExists) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
      }
    }

    // Gán các trường được gửi lên
    Object.entries(updateFields).forEach(([key, value]) => {
      evaluate[key] = value;
    });

    await evaluate.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật đánh giá thành công.',
      data: evaluate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ.',
      error: error.message
    });
  }
});

// 📌 DELETE đánh giá theo ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Evaluate.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá để xoá.' });
    res.status(200).json({ success: true, message: 'Xoá đánh giá thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

module.exports = router;
