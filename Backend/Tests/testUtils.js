// Backend/Tests/testUtils.js
const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../app");
const { models } = require("../Database/db");

function api() {
  return request(app);
}

async function createUser({ Name, Email, Password, Role = "Client", PhoneNr = "123456789" }) {
  const hash = await bcrypt.hash(Password, 10);
  return models.User.create({ Name, Email, Password: hash, Role, PhoneNr });
}

async function loginAndGetToken(email, password) {
  const res = await api()
    .post("/api/auth/login")
    .send({ Email: email, Password: password });

  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status} ${res.text}`);
  }
  return res.body.token || res.body.accessToken || null;
}

module.exports = {
  api,
  createUser,
  loginAndGetToken,
  models,
};
