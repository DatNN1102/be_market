const express = require('express');
const router = express.Router();
const Warranty = require('../models/warranty');
const verifyToken = require('../middleware/verifyToken');

const generateWarrantyCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code;
  let exists = true;

  while (exists) {
    code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    // Kiểm tra trùng trong DB
    exists = await Warranty.exists({ warrantyCode: code });
  }

  return code;
};

// 📌 GET tất cả đơn bảo hành (có phân trang & lọc)
router.get('/', async (req, res) => {
  try {
    const {
      status,
      warrantyCode,
      phone,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (warrantyCode) query.warrantyCode = { $regex: warrantyCode, $options: 'i' };
    if (phone) query.phone = { $regex: phone, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const warranties = await Warranty.find(query)
      .sort({ TimeCreate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Warranty.countDocuments(query);

    res.status(200).json({
      success: true,
      data: warranties,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

router.get('/my-warranties', verifyToken, async (req, res) => {
  try {
    const {
      status,
      warrantyCode,
      phone,
      page = 1,
      limit = 10
    } = req.query;

    const query = { userID: req.user._id }; // Lọc theo userId từ token

    if (status) query.status = status;
    if (warrantyCode) query.warrantyCode = { $regex: warrantyCode, $options: 'i' };
    if (phone) query.phone = { $regex: phone, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const warranties = await Warranty.find(query)
      .sort({ TimeCreate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Warranty.countDocuments(query);

    res.status(200).json({
      success: true,
      data: warranties,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching user warranties:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

// 📌 GET đơn bảo hành theo ID
router.get('/:id', async (req, res) => {
  try {
    const warranty = await Warranty.findById(req.params.id);
    if (!warranty) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn bảo hành.' });
    }
    res.status(200).json({ success: true, data: warranty });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

// 📌 POST tạo đơn bảo hành
router.post('/', async (req, res) => {
  try {
    const warrantyCode = await generateWarrantyCode();

    const newWarranty = new Warranty({
      ...req.body,
      warrantyCode, // Gán mã code mới sinh
    });

    await newWarranty.save();

    res.status(201).json({
      success: true,
      message: 'Đơn bảo hành đã được tạo.',
      data: newWarranty
    });
  } catch (error) {
    if (error.code === 11000) { // Duplicate warrantyCode
      return res.status(400).json({
        success: false,
        message: 'Mã bảo hành đã tồn tại.'
      });
    }
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

// 📌 PUT cập nhật đơn bảo hành theo ID
router.put('/:id', async (req, res) => {
  try {
    const warranty = await Warranty.findById(req.params.id);
    if (!warranty) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn bảo hành.' });
    }

    // Cập nhật chỉ các trường được gửi lên
    Object.entries(req.body).forEach(([key, value]) => {
      warranty[key] = value;
    });

    await warranty.save();
    res.status(200).json({
      success: true,
      message: 'Cập nhật đơn bảo hành thành công.',
      data: warranty
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ.',
      error: error.message
    });
  }
});

// 📌 DELETE xoá đơn bảo hành theo ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Warranty.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn bảo hành để xoá.' });
    }
    res.status(200).json({
      success: true,
      message: 'Xoá đơn bảo hành thành công.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

module.exports = router;
