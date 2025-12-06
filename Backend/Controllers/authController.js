const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { models } = require("../Database/db");

module.exports = {
  async register(req, res) {
    try {
      const {
        Name,
        Lastname,
        City,
        Street,
        StreetNr,
        PhoneNr,
        Email,
        Password,
        PostNr,
        Role,
      } = req.body;

      const existingUser = await models.User.findOne({ where: { Email } });
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(Password, 10);

      const newUser = await models.User.create({
        Name,
        Lastname,
        City,
        Street,
        StreetNr,
        PhoneNr,
        Email,
        Password: hashedPassword,
        PostNr,
        Role: Role || "Client",
      });

      res.status(201).json({ message: "Registered successfully", userId: newUser.UID });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error while registering" });
    }
  },

  async login(req, res) {
    try {
      const { Email, Password } = req.body;

      if (!Email || !Password) {
        return res.status(400).json({
          error: "Email and password are required",
        });
      }

      const user = await models.User.findOne({ where: { Email } });
      if (!user) {
        return res.status(401).json({ error: "Incorrect email or password" });
      }

      const isPasswordValid = await bcrypt.compare(Password, user.Password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Incorrect email or password" });
      }

      if (user.MustChangePassword) {
        return res.status(403).json({
          error: "Temporary password. You must change it before logging in.",
          mustChangePassword: true,
          userId: user.UID,
        });
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
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({ message: "Logged in successfully", role: user.Role });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error while logging in" });
    }
  },

  logout(req, res) {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
  },

  async me(req, res) {
    try {
      const user = await models.User.findByPk(req.user.id, {
        attributes: { exclude: ["Password"] },
      });

      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error while fetching user" });
    }
  },
};
