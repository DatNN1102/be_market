// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/mongo/mongo');
const routes = require('./src/router/index');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

connectDB()

app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});