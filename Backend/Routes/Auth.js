const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { models } = require("../Database/db");
const auth = require("../Middleware/Auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { Name, Lastname, City, Street, StreetNr, PhoneNr, Email, Password, PostNr, Role } = req.body;

    const existingUser = await models.Users.findOne({ where: { Email } });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    const newUser = await models.Users.create({
      Name,
      Lastname,
      City,
      Street,
      StreetNr,
      PhoneNr,
      Email,
      Password: hashedPassword,
      PostNr,
      Role: Role || "Client" 
    });

    res.status(201).json({ message: "Registered successfully", userId: newUser.UID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while registering" });
  }
});

router.post("/login", async (req, res) => {

  try {
    console.log("BODY SEEN BY EXPRESS:", req.body);
    const body = req.body || {};
    const email = body.Email;
    const password = body.Password;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email i Password są wymagane. Upewnij się, że wysyłasz JSON (Content-Type: application/json) lub x-www-form-urlencoded."
      });
    }

    const user = await models.Users.findOne({ where: { Email: email } });
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const token = jwt.sign(
      { id: user.UID, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ message: "Logged in successfully", role: user.Role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while logging in" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

router.get("/me", auth(), async (req, res) => {
  try {
    const user = await models.Users.findByPk(req.user.id, {
      attributes: { exclude: ["Password"] }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error while fetching user" });
  }
});

module.exports = router;
