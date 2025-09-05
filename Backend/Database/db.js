require('dotenv').config({path: '../secret_key.env'});

const { sequelize } = require('sequelize');

const db = new sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: 3306,
    showWarnings: true,
    connectionTimeout: 10000
});

module.exports = db;