const express = require('express');
const router = express.Router();
const multer = require('multer');
const OpenAI = require('openai');
const axios = require('axios'); // Thêm axios để tải ảnh từ URL
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const OPENAI_MODEL_NAME = process.env.OPENAI_MODEL_NAME || "gpt-4o";

// ================= MULTER =================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB
}).fields([
    { name: 'bodyImage', maxCount: 1 },
    { name: 'pantImage', maxCount: 1 },
    { name: 'shirtImage', maxCount: 1 }
]);

const convertImageToBase64 = (file) => {
    return file.buffer.toString("base64");
};

const generateTryonPrompt = () => {
    return `You are a high-end AI Fashion Stylist and Image Synthesis expert. 
  Your goal is to perform a seamless virtual try-on by merging three input images: [Body/Person], [Pants], and [Shirt/Top].

  ### CORE OBJECTIVES:
  1. IDENTITY PRESERVATION: Maintain the exact facial features, skin tone, hairstyle, and body proportions of the person in the [Body] image. The person must be 100% recognizable.
  2. SEAMLESS INTEGRATION: Synthesize the [Shirt] and [Pants] onto the body with realistic physics. Clothing must show natural folds, creases, and shadows that correspond to the person's pose and physique.
  3. TEXTURE & DETAIL: Preserve the original fabric texture, patterns, and colors of the clothing items. 
  4. LIGHTING CONSISTENCY: Ensure the lighting on the clothes matches the ambient lighting of the original [Body] image for a non-photoshopped, professional look.

  ### STYLE REQUIREMENTS:
  - Hyper-realistic, 8k resolution, cinematic lighting.
  - No distortion in the face or limbs.
  - The tucking of the shirt (tucked or untucked) should look natural based on the garment's style.
  - Final output should look like a real photograph taken in a studio or natural environment.

  Generate a masterpiece that allows the user to accurately judge if the outfit suits their style and body type.`;
};

// ================= ROUTE =================
router.post('/generate', upload, async (req, res) => {
    try {
        const bodyImageBase64 = convertImageToBase64(req.files.bodyImage[0]);
        const pantImageBase64 = convertImageToBase64(req.files.pantImage[0]);
        const shirtImageBase64 = convertImageToBase64(req.files.shirtImage[0]);

        if (!bodyImageBase64 || !pantImageBase64 || !shirtImageBase64) {
            return res.status(400).json({
                success: false,
                message: "Thiếu dữ liệu ảnh! Anh cần cung cấp đủ 3 ảnh (File hoặc URL) cho: bodyImage, pantImage, shirtImage."
            });
        }

        // 2️⃣ Gọi OpenAI Vision
        const response = await openai.responses.create({
            model: OPENAI_MODEL_NAME,
            input: [
                {
                    role: "user",
                    content: [
                        { type: "input_text", text: generateTryonPrompt() },
                        {
                            type: "input_image",
                            image_url: `data:image/jpeg;base64,${bodyImageBase64}`,
                        },
                        {
                            type: "input_image",
                            image_url: `data:image/jpeg;base64,${pantImageBase64}`,
                        },
                        {
                            type: "input_image",
                            image_url: `data:image/jpeg;base64,${shirtImageBase64}`,
                        },
                    ],
                }
            ],
            tools: [{ type: "image_generation" }],
        });

        const imageData = response.output
            .filter((output) => output.type === "image_generation_call")
            .map((output) => output.result);

        return res.status(200).json({
            success: true,
            message: "Virtual try-on completed successfully",
            data: {
                imageUrl: imageData,
                timestamp: new Date(),
            },
        });

    } catch (err) {
        console.error('[TRY-ON ERROR]', err);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;