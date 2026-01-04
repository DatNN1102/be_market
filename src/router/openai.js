const express = require('express');
const router = express.Router();
const multer = require('multer');
const OpenAI = require('openai');
const axios = require('axios');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
const OPENAI_MODEL_NAME = process.env.OPENAI_MODEL_NAME || "gpt-4o";
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }
}).fields([
    { name: 'bodyImage', maxCount: 1 },
    { name: 'pantImage', maxCount: 1 },
    { name: 'shirtImage', maxCount: 1 }
]);

const processInputToBase64 = async (req, fieldName) => {
    if (req.files && req.files[fieldName] && req.files[fieldName][0]) {
        console.log(`[Processing] ${fieldName} found as FILE.`);
        return req.files[fieldName][0].buffer.toString("base64");
    }
    if (req.body && req.body[fieldName]) {
        const url = req.body[fieldName];
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer'
            });
            return Buffer.from(response.data).toString('base64');
        } catch (error) {
            console.error(`[Download Error] Cannot download image from ${url}`);
            throw new Error(`Không tải được ảnh từ URL của trường ${fieldName}`);
        }
    }
    return null;
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

router.post('/generate', upload, async (req, res) => {
    try {
        const [bodyBase64, pantBase64, shirtBase64] = await Promise.all([
            processInputToBase64(req, 'bodyImage'),
            processInputToBase64(req, 'pantImage'),
            processInputToBase64(req, 'shirtImage')
        ]);

        if (!bodyBase64 || !pantBase64 || !shirtBase64) {
            return res.status(400).json({
                success: false,
                message: "Thiếu dữ liệu! Vui lòng upload File hoặc điền URL cho cả 3 trường: bodyImage, pantImage, shirtImage."
            });
        }

        const response = await openai.responses.create({
            model: OPENAI_MODEL_NAME,
            input: [
                {
                    role: "user",
                    content: [
                        { type: "input_text", text: generateTryonPrompt() },
                        { type: "input_image", image_url: `data:image/jpeg;base64,${bodyBase64}` },
                        { type: "input_image", image_url: `data:image/jpeg;base64,${pantBase64}` },
                        { type: "input_image", image_url: `data:image/jpeg;base64,${shirtBase64}` },
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
        console.error('[ERROR]', err.message);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;