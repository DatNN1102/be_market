const express = require('express');
const userRoutes = require('./users');
const productsRoutes = require('./products');
const transactionRoutes = require('./transaction');
const vnpRoutes = require('./vnpay');
const imgRoutes = require('./img');
const statisticsRoutes = require('./statistics');
const evaluateRoutes = require('./evaluate');
const warrantyRoutes = require('./warranty');
const productFeaturesRoutes = require('./product-features');
const openAI = require('./openai');

const router = express.Router();

router.use('/', userRoutes);
router.use('/products', productsRoutes);
router.use('/transaction', transactionRoutes);
router.use('/vnp', vnpRoutes);
router.use('/img', imgRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/evaluate', evaluateRoutes);
router.use('/warranty', warrantyRoutes);
router.use('/product-features', productFeaturesRoutes);
router.use('/openai', openAI);

module.exports = router;