const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const TransactionDetail = require('../models/transaction_detail');

// Helper để parse ngày
const parseDateInput = (input, type) => {
    try {
        const [d1, d2, d3] = input.split('-').map(Number);
        let start, end;

        switch (type) {
            case 'daily':
                start = new Date(d3, d2 - 1, d1, 0, 0, 0);
                end = new Date(d3, d2 - 1, d1, 23, 59, 59, 999);
                break;
            case 'monthly':
                start = new Date(d2, d1 - 1, 1, 0, 0, 0);
                end = new Date(d2, d1, 0, 23, 59, 59, 999);
                break;
            case 'yearly':
                start = new Date(d1, 0, 1, 0, 0, 0);
                end = new Date(d1, 11, 31, 23, 59, 59, 999);
                break;
            case 'range':
                start = new Date(d3, d2 - 1, d1);
                return start;
            default:
                return null;
        }

        return { start, end };
    } catch {
        return null;
    }
};

// API chính
router.get('/', async (req, res) => {
    try {
        const { type, from, to } = req.query;
        if (!type || !from) {
            return res.status(400).json({ success: false, message: 'Thiếu type hoặc from.' });
        }

        let matchStage = {};
        let groupStage = null;
        let details = {};
        let totalRevenue = 0;
        let totalTransactions = 0;
        let totalSold = 0;

        switch (type) {
            case 'daily': {
                const range = parseDateInput(from, 'daily');
                if (!range) return res.status(400).json({ success: false, message: 'Sai định dạng from (dd-mm-yyyy).' });

                matchStage.createdAt = { $gte: range.start, $lte: range.end };
                groupStage = { hour: { $hour: '$createdAt' } };

                const [transAgg, detailAgg] = await Promise.all([
                    Transaction.aggregate([
                        { $match: matchStage },
                        { $group: { _id: groupStage, totalRevenue: { $sum: '$totalPrice' }, totalTransactions: { $sum: 1 } } }
                    ]),
                    TransactionDetail.aggregate([
                        { $match: matchStage },
                        { $group: { _id: groupStage, totalSold: { $sum: '$number' } } }
                    ])
                ]);

                for (let i = 0; i < 24; i++) {
                    const trans = transAgg.find(r => r._id.hour === i);
                    const sold = detailAgg.find(r => r._id.hour === i);

                    details[i] = {
                        totalRevenue: trans?.totalRevenue || 0,
                        totalTransactions: trans?.totalTransactions || 0,
                        totalSold: sold?.totalSold || 0
                    };

                    totalRevenue += trans?.totalRevenue || 0;
                    totalTransactions += trans?.totalTransactions || 0;
                    totalSold += sold?.totalSold || 0;
                }
                break;
            }

            case 'monthly': {
                const range = parseDateInput(from, 'monthly');
                if (!range) return res.status(400).json({ success: false, message: 'Sai định dạng from (mm-yyyy).' });

                matchStage.createdAt = { $gte: range.start, $lte: range.end };
                groupStage = { day: { $dayOfMonth: '$createdAt' } };
                const daysInMonth = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0).getDate();

                const [transAgg, detailAgg] = await Promise.all([
                    Transaction.aggregate([
                        { $match: matchStage },
                        { $group: { _id: groupStage, totalRevenue: { $sum: '$totalPrice' }, totalTransactions: { $sum: 1 } } }
                    ]),
                    TransactionDetail.aggregate([
                        { $match: matchStage },
                        { $group: { _id: groupStage, totalSold: { $sum: '$number' } } }
                    ])
                ]);

                for (let i = 1; i <= daysInMonth; i++) {
                    const trans = transAgg.find(r => r._id.day === i);
                    const sold = detailAgg.find(r => r._id.day === i);

                    details[i] = {
                        totalRevenue: trans?.totalRevenue || 0,
                        totalTransactions: trans?.totalTransactions || 0,
                        totalSold: sold?.totalSold || 0
                    };

                    totalRevenue += trans?.totalRevenue || 0;
                    totalTransactions += trans?.totalTransactions || 0;
                    totalSold += sold?.totalSold || 0;
                }
                break;
            }

            case 'yearly': {
                const range = parseDateInput(from, 'yearly');
                if (!range) return res.status(400).json({ success: false, message: 'Sai định dạng from (yyyy).' });

                matchStage.createdAt = { $gte: range.start, $lte: range.end };
                groupStage = { month: { $month: '$createdAt' } };

                const [transAgg, detailAgg] = await Promise.all([
                    Transaction.aggregate([
                        { $match: matchStage },
                        { $group: { _id: groupStage, totalRevenue: { $sum: '$totalPrice' }, totalTransactions: { $sum: 1 } } }
                    ]),
                    TransactionDetail.aggregate([
                        { $match: matchStage },
                        { $group: { _id: groupStage, totalSold: { $sum: '$number' } } }
                    ])
                ]);

                for (let i = 1; i <= 12; i++) {
                    const trans = transAgg.find(r => r._id.month === i);
                    const sold = detailAgg.find(r => r._id.month === i);

                    details[i] = {
                        totalRevenue: trans?.totalRevenue || 0,
                        totalTransactions: trans?.totalTransactions || 0,
                        totalSold: sold?.totalSold || 0
                    };

                    totalRevenue += trans?.totalRevenue || 0;
                    totalTransactions += trans?.totalTransactions || 0;
                    totalSold += sold?.totalSold || 0;
                }
                break;
            }

            case 'range': {
                if (!to) return res.status(400).json({ success: false, message: 'Thiếu to trong kiểu range.' });

                const start = parseDateInput(from, 'range');
                const end = parseDateInput(to, 'range');
                if (!start || !end) return res.status(400).json({ success: false, message: 'Sai định dạng from/to (dd-mm-yyyy).' });

                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                matchStage.createdAt = { $gte: start, $lte: end };

                const [transactions, productDetails] = await Promise.all([
                    Transaction.find(matchStage).lean(),
                    TransactionDetail.find(matchStage).lean()
                ]);

                totalRevenue = transactions.reduce((sum, t) => sum + t.totalPrice, 0);
                totalTransactions = transactions.length;
                totalSold = productDetails.reduce((sum, p) => sum + p.number, 0);

                break;
            }

            default:
                return res.status(400).json({ success: false, message: 'Type không hợp lệ. Dùng daily, monthly, yearly, range.' });
        }

        return res.json({
            success: true,
            data: {
                totalRevenue,
                totalTransactions,
                totalSold,
                details
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: err.message });
    }
});

module.exports = router;
