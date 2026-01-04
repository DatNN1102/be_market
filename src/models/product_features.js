const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductFeaturesSchema = new Schema({
    nameFeature: {
        type: String,
        required: true,
        trim: true
    },
    valueFeature: {
        type: String,
        required: true,
        trim: true
    },
    isShow: {
        type: Number,
        required: true,
        default: 1
    }
}, {
    timestamps: true // tự động thêm: createdAt, updatedAt
});

module.exports = mongoose.model('ProductFeatures', ProductFeaturesSchema);
