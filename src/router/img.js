const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Đường dẫn tới thư mục chứa ảnh
const uploadDir = path.join(__dirname, '../../uploads');

// Endpoint để tải ảnh dựa vào tên file
router.get('/:filename', async (req, res) => {
    const filename = req.params.filename;
    try {
        // Kiểm tra xem tệp có tồn tại không
        fs.access(path.join(uploadDir, filename), fs.constants.F_OK, (err) => {
            if (err) {
                return res.status(404).send({ message: 'File not found' });
            }
            // Đọc và trả về nội dung của file
            fs.createReadStream(path.join(uploadDir, filename)).pipe(res);
        });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Cấu hình multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Endpoint để upload ảnh
router.post('/upload', upload.single('image'), (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).send({ message: 'No file uploaded' });
        }
        res.status(201).send({ message: 'Success', file });
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;