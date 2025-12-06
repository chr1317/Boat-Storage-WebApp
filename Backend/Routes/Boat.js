// routes/boats.js
const express = require("express");
const router = express.Router();
const auth = require("../Middleware/Auth");

const BoatsController = require("../Controllers/boatsController");

// SPECIFIC ROUTES FIRST
router.get("/byqr/:qr", auth(["Admin","Employee","Client"]), BoatsController.getBoatByQR);

// CREATE
router.post("/", auth(["Admin","Employee"]), BoatsController.createBoat);

// LIST
router.get("/", auth(["Admin","Employee","Client"]), BoatsController.listBoats);

// GET ONE
router.get("/:id", auth(["Admin","Employee","Client"]), BoatsController.getBoat);

// UPDATE
router.put("/:id", auth(["Admin","Employee","Client"]), BoatsController.updateBoat);

// DELETE
router.delete("/:id", auth(["Admin","Employee","Client"]), BoatsController.deleteBoat);

// SET OUT DATE
router.put("/:id/out", auth(["Admin","Employee","Client"]), BoatsController.setOut);

module.exports = router;
