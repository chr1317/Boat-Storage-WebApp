const express = require("express");
const auth = require("../Middleware/Auth");
const SeasonsController = require("../Controllers/seasonsController");

const router = express.Router();

router.post("/", auth(["Admin","Employee"]), SeasonsController.create);

router.get("/", auth(["Admin","Employee","Client"]), SeasonsController.list);

router.get("/:id", auth(["Admin","Employee","Client"]), SeasonsController.getOne);

router.put("/:id", auth(["Admin","Employee"]), SeasonsController.update);

router.delete("/:id", auth(["Admin","Employee"]), SeasonsController.delete);

module.exports = router;
