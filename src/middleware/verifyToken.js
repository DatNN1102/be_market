const jwt = require('jsonwebtoken');
const User = require('../models/users'); // hoặc đường dẫn phù hợp

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
    }

    req.user = user; // gắn user vào request
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ.', error: err.message });
  }
};

module.exports = verifyToken;
