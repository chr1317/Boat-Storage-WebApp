// Backend/Routes/Seasons.js
const express = require("express");
const auth = require("../Middleware/Auth");
const SeasonsController = require("../Controllers/seasonsController");

const router = express.Router();

// CREATE
router.post("/", auth(["Admin","Employee"]), SeasonsController.create);

// LIST
router.get("/", auth(["Admin","Employee","Client"]), SeasonsController.list);

// GET ONE
router.get("/:id", auth(["Admin","Employee","Client"]), SeasonsController.getOne);

// UPDATE
router.put("/:id", auth(["Admin","Employee"]), SeasonsController.update);

// DELETE
router.delete("/:id", auth(["Admin","Employee"]), SeasonsController.delete);

module.exports = router;
