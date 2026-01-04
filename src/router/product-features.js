const express = require('express');
const router = express.Router();
const ProductFeature = require('../models/product_features');

// 📌 GET tất cả productFeatures
router.get('/', async (req, res) => {
  try {
    const {
      isShow,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    // Lọc theo isShow nếu có
    if (isShow !== undefined) {
      query.isShow = parseInt(isShow);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const features = await ProductFeature.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ProductFeature.countDocuments(query);

    res.status(200).json({
      success: true,
      data: features,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

// 📌 GET productFeature theo ID
router.get('/:id', async (req, res) => {
  try {
    const feature = await ProductFeature.findById(req.params.id);
    if (!feature) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tính năng.' });
    }
    res.status(200).json({ success: true, data: feature });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

// 📌 POST thêm productFeature
router.post('/', async (req, res) => {
  const { nameFeature, valueFeature, isShow } = req.body;

  if (!nameFeature || !valueFeature) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });
  }

  try {
    const newFeature = new ProductFeature({
      nameFeature,
      valueFeature,
      isShow: isShow !== undefined ? isShow : 1
    });

    await newFeature.save();
    res.status(201).json({ success: true, message: 'Thêm tính năng thành công.', data: newFeature });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

// 📌 PUT cập nhật productFeature
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updateFields = req.body;

  try {
    const feature = await ProductFeature.findById(id);
    if (!feature) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tính năng.' });
    }

    Object.entries(updateFields).forEach(([key, value]) => {
      feature[key] = value;
    });

    await feature.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật tính năng thành công.',
      data: feature
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ.',
      error: error.message
    });
  }
});

// 📌 DELETE xóa productFeature
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ProductFeature.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy tính năng để xoá.' });
    res.status(200).json({ success: true, message: 'Xoá tính năng thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

module.exports = router;
