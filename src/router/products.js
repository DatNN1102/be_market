const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Product = require('../models/products');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // tạo thư mục nếu chưa có
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // ví dụ: 17173289023-image.jpg
  }
});

const upload = multer({ storage });

// 📌 GET all products
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      sort = 'asc',
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
      sensorValve,
      feature
    } = req.query;

    const query = {
      name: { $regex: search, $options: 'i' }
    };

    // Lọc khoảng giá
    if (minPrice || maxPrice) {
      query.promotionalPrice = {};
      if (minPrice) query.promotionalPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.promotionalPrice.$lte = parseFloat(maxPrice);
    }

    // Lọc theo sensorValve
    if (sensorValve) {
      const sensors = Array.isArray(sensorValve)
        ? sensorValve
        : sensorValve.split(',').map(v => v.trim());
      query.sensorValve = { $in: sensors };
    }

    // ✅ Lọc theo feature (Object)
    if (feature) {
      const parsedFeatures = typeof feature === 'string'
        ? JSON.parse(feature)
        : feature;

      const featureQueries = Object.entries(parsedFeatures).reduce((acc, [key, values]) => {
        const valuesArray = Array.isArray(values) ? values : [values];

        if (valuesArray.length > 0) {
          valuesArray.forEach((val) => {
            const regexStr = `"${key}":"${val}"`; // Tìm chính xác cặp key-value trong JSON string
            acc.push({ feature: { $regex: regexStr, $options: 'i' } });
          });
        }
        return acc;
      }, []);

      if (featureQueries.length > 0) {
        query.$and = query.$and || [];
        query.$and.push(...featureQueries);
      }
    }

    // Sort và phân trang
    const sortOption = sort === 'desc' ? -1 : 1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .sort({ realPrice: sortOption })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});



// 📌 GET single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error });
  }
});

// 📌 CREATE product
router.post('/', upload.array('images', 10), async (req, res) => {
  const { name, realPrice, promotionalPrice, description, sensorValve, feature, detail, status, quantity, warrantyPeriod } = req.body;

  if (!name || realPrice == null) {
    return res.status(400).json({ success: false, message: 'Tên và giá gốc là bắt buộc.' });
  }

  try {
    // Lấy danh sách tên file ảnh đã upload
    const imageFilenames = req.files.map(file => file.filename);
    const imageString = imageFilenames.join(',');

    const newProduct = new Product({
      name,
      realPrice,
      promotionalPrice,
      description,
      sensorValve,
      feature,
      detail,
      status,
      quantity,
      images: imageString,
      warrantyPeriod
    });

    await newProduct.save();
    res.status(201).json({ success: true, message: 'Thêm sản phẩm thành công.', product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error });
  }
});

// 📌 UPDATE product
router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const {
      name,
      realPrice,
      promotionalPrice,
      description,
      sensorValve,
      feature,
      detail,
      status,
      quantity,
      warrantyPeriod,
      oldImages,
    } = req.body;

    const updateData = {
      name,
      realPrice,
      promotionalPrice,
      description,
      sensorValve,
      feature,
      detail,
      status,
      quantity,
      warrantyPeriod
    };

    // Parse danh sách ảnh cũ từ JSON nếu có
    let oldImageList = [];

    if (oldImages) {
      oldImageList = oldImages.split(',');
    }

    // Xử lý ảnh mới
    let newImageList = [];
    if (req.files && req.files.length > 0) {
      newImageList = req.files.map(file => file.filename); // ['new1.jpg', 'new2.jpg']
    }

    // Gộp ảnh cũ + mới
    updateData.images = [...oldImageList, ...newImageList].join(',');

    // Cập nhật
    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để cập nhật.' });
    }

    res.status(200).json({ success: true, message: 'Cập nhật sản phẩm thành công.', product: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

// 📌 DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để xoá.' });
    res.status(200).json({ success: true, message: 'Xoá sản phẩm thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error });
  }
});

module.exports = router;