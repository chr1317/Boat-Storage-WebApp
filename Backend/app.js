const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require("cookie-parser");
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    exposeHeaders: ['Content-Type', 'Content-Disposition'],
    origin: ['http://localhost:5137', 'http://localhost:3000'],
    credentials: true
}));
