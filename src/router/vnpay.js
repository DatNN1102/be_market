const express = require('express');
const moment = require('moment');
const crypto = require('crypto');
const qs = require('qs');
const router = express.Router();
const Transaction = require('../models/transaction');

router.post('/create_payment', (req, res) => {
  const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') ? '127.0.0.1' : ipAddr;

  const tmnCode = process.env.VNP_TMNCODE;
  const secretKey = process.env.VNP_HASHSECRET;
  const vnpUrl = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURNURL;

  const date = new Date();
  const createDate = moment(date).format('YYYYMMDDHHmmss');
  const expireDate = moment(date).add(15, 'minutes').format('YYYYMMDDHHmmss');
  const orderId = moment(date).format('HHmmss');
  const amount = parseInt(req.body.amount) || 100000;
  const orderCode = req.body.orderCode || '';
  const bankCode = req.query.bankCode;
  const locale = req.query.language || 'vn';

  let vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: amount * 100,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderCode,
    vnp_OrderType: 'other',
    vnp_Locale: locale,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: cleanIp,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate
  };

  if (bankCode) {
    vnp_Params['vnp_BankCode'] = bankCode;
  }

  // ✅ Sắp xếp tham số A-Z để tạo chuỗi ký
  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });

  // ✅ Tạo chữ ký SHA512
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // ✅ Gắn chữ ký vào
  sortedParams['vnp_SecureHash'] = signed;

  const paymentUrl = `${vnpUrl}?${qs.stringify(sortedParams, { encode: false })}`;

  res.status(200).json({ success: true, url: paymentUrl });
});

// Hàm sắp xếp object theo thứ tự alphabet
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}


router.get('/vnpay_return', async (req, res) => {
  const vnp_Params = { ...req.query };
  const secureHash = vnp_Params['vnp_SecureHash'];

  if ('vnp_SecureHash' in vnp_Params) delete vnp_Params['vnp_SecureHash'];
  if ('vnp_SecureHashType' in vnp_Params) delete vnp_Params['vnp_SecureHashType'];

  // Sắp xếp và tạo chuỗi ký
  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', process.env.VNP_HASHSECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  if (secureHash === signed) {
    try {
      const orderCode = vnp_Params['vnp_OrderInfo']?.replace('Thanh toan don hang ', '').trim();

      if (!orderCode) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy mã đơn hàng trong OrderInfo.' });
      }

      const transaction = await Transaction.findOne({ code: orderCode });

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch.' });
      }

      // Cập nhật trạng thái đã thanh toán
      transaction.isPaid = true;
      await transaction.save();

      return res.redirect(`http://localhost:5173/order-success/${orderCode}`);
    } catch (error) {
      console.error('Lỗi cập nhật giao dịch:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
  } else {
    res.status(400).json({ success: false, message: 'Chữ ký không hợp lệ' });
  }
});


module.exports = router;
