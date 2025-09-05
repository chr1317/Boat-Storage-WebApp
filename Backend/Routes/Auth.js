const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { models } = require("../db");
const auth = require("../Middleware/Auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { Name, Lastname, City, Street, StreetNr, PhoneNr, Email, Password, PostNr, Role } = req.body;

    const existingUser = await models.Users.findOne({ where: { Email } });
    if (existingUser) {
      return res.status(400).json({ error: "Użytkownik z tym adresem email już istnieje" });
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

    res.status(201).json({ message: "Rejestracja udana", userId: newUser.UID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd serwera przy rejestracji" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { Email, Password } = req.body;

    const user = await models.Users.findOne({ where: { Email } });
    if (!user) {
      return res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
    }

    const isPasswordValid = await bcrypt.compare(Password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
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

    res.json({ message: "Zalogowano pomyślnie", role: user.Role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd serwera przy logowaniu" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Wylogowano" });
});

router.get("/me", auth(), async (req, res) => {
  try {
    const user = await models.Users.findByPk(req.user.id, {
      attributes: { exclude: ["Password"] }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Błąd serwera przy pobieraniu danych" });
  }
});

module.exports = router;
