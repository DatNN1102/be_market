const express = require('express');
const router = express.Router();
// const { secretKey } = require('../../config');
const User = require('../models/users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/verifyToken');
const secretKey = process.env.JWT_SECRET;

router.get('/users', async (req, res) => {
  try {
    const {
      search = '',
      email = '',
      page = 1,
      limit = 10
    } = req.query;

    const query = {
      username: { $regex: search, $options: 'i' },
      email: { $regex: email, $options: 'i' }
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query, '-password')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

router.post('/register', async (req, res) => {
  const {
    username,
    password,
    fullName,
    role,
    email,
    phone,
    address
  } = req.body;

  // Kiểm tra các trường bắt buộc
  if (!username || !password || !email) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc.' });
  }

  try {
    // Kiểm tra username hoặc email đã tồn tại
    const existingUser = await User.findOne({ $or: [{ username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username hoặc email đã tồn tại.' });
    }

    // Hash mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo user mới
    const newUser = new User({
      username,
      password: passwordHash,
      fullName,
      role: role || 'user',
      email,
      phone,
      address
    });

    await newUser.save();

    return res.status(201).json({ success: true, message: 'Đăng ký thành công.' });
  } catch (error) {
    console.error('Lỗi máy chủ:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Tài khoản không tồn tại.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu không chính xác.' });
    }
    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1d' });
    res.status(200).json({ success: true, userId: user._id, username: user.username, role: user.role, token: token });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

router.post('/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ mật khẩu hiện tại và mật khẩu mới.' });
  }

  try {
    const user = await User.findById(req.user._id); // Từ verifyToken gán vào req.user
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }
    // So sánh mật khẩu cũ
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
    }
    // Mã hoá mật khẩu mới và lưu lại
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    return res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

router.put('/update-profile', verifyToken, async (req, res) => {
  const { email, phone, address, fullName } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    // Cập nhật các trường nếu có dữ liệu
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (fullName) user.fullName = fullName;

    await user.save();

    res.status(200).json({
      success: true, message: 'Cập nhật thông tin thành công.', data: {
        email: user.email,
        phone: user.phone,
        address: user.address,
        fullName: user.fullName,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
  }
});

module.exports = router;