const express = require("express");
const router = express.Router();
const auth = require("../Middleware/Auth");

const AuthController = require("../Controllers/authController");

router.post("/register", AuthController.register);

router.post("/login", AuthController.login);

router.post("/logout", AuthController.logout);

router.get("/me", auth(), AuthController.me);

module.exports = router;
