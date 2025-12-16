const express = require("express");
const router = express.Router();
const auth = require("../Middleware/Auth");

const BoatsController = require("../Controllers/boatsController");

router.get("/byqr/:qr", auth(["Admin","Employee","Client"]), BoatsController.getBoatByQR);

router.post("/", auth(["Admin","Employee"]), BoatsController.createBoat);

router.get("/", auth(["Admin","Employee","Client"]), BoatsController.listBoats);

router.get("/:id", auth(["Admin","Employee","Client"]), BoatsController.getBoat);

router.put("/:id", auth(["Admin","Employee","Client"]), BoatsController.updateBoat);

router.delete("/:id", auth(["Admin","Employee","Client"]), BoatsController.deleteBoat);

router.put("/:id/out", auth(["Admin","Employee","Client"]), BoatsController.setOut);

module.exports = router;
