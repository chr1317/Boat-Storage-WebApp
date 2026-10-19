// require("dotenv").config({ path: "../secret_key.env" });
const { Sequelize } = require("sequelize");
const initModels = require("../Models/Initmodels");

const isTest = process.env.NODE_ENV === "test";

const sequelize = new Sequelize(
  isTest ? process.env.DB_NAME_TEST : process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || "mariadb",
    port: process.env.DB_PORT || 3306,
    logging: console.log,
  }
);

const models = initModels(sequelize);

module.exports = { sequelize, models };
