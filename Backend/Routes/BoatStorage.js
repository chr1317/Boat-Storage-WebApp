// routes/boatStorage.js
const express = require("express");
const router = express.Router();
const auth = require("../Middleware/Auth");

const BoatStorageController = require("../Controllers/boatStorageController");

router.post("/", auth(["Admin","Employee"]), BoatStorageController.create);

router.get("/", auth(["Admin","Employee"]), BoatStorageController.list);

router.get("/light", auth(["Admin","Employee"]), BoatStorageController.listLight);

router.get("/mine", auth(["Client","Admin","Employee"]), BoatStorageController.mine);

router.get("/byBoat/:bid", auth(["Admin","Employee","Client"]), BoatStorageController.byBoat);

router.get("/:id", auth(["Admin","Employee","Client"]), BoatStorageController.getOne);

router.put("/:id", auth(["Admin","Employee"]), BoatStorageController.update);

router.delete("/:id", auth(["Admin","Employee"]), BoatStorageController.delete);

router.patch("/:id/budget", auth(["Admin","Employee","Client"]), BoatStorageController.updateBudget);

module.exports = router;
