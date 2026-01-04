const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const path = require('path');

// 📌 Upload một ảnh
router.post('/single', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Không có file.' });

  const imageUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, url: imageUrl });
});

// 📌 Upload nhiều ảnh
router.post('/multiple', upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'Không có file nào được tải lên.' });
  }

  const urls = req.files.map(file => `/uploads/${file.filename}`);
  res.status(200).json({ success: true, urls });
});

// 📌 Trả về ảnh theo tên file
router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '..', 'uploads', filename);

  fs.access(imagePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ success: false, message: 'Ảnh không tồn tại.' });
    }

    res.sendFile(imagePath);
  });
});

module.exports = router;
