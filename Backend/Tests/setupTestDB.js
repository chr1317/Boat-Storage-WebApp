const { sequelize, models } = require("../Database/db");




async function initTestDb() {
  console.log("TEST ENV:", process.env.DB_USER, process.env.DB_PASS, process.env.DB_NAME_TEST);
  await sequelize.sync({ force: true });
}

async function closeTestDb() {
  await sequelize.close();
}

module.exports = { initTestDb, closeTestDb, models };
