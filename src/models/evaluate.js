const mongoose = require('mongoose');
const { Schema } = mongoose;

const EvaluateSchema = new Schema({
    productID: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    contentEvaluate: {
        type: String,
        required: true
    },
    starRating: {
        type: Number,
        required: true
    },
    isShow: {
        type: Number,
        required: true,
        default: 1
    }
}, {
    timestamps: true // tự động thêm: createdAt, updatedAt
});

module.exports = mongoose.model('Evaluate', EvaluateSchema);
