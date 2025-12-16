const express = require("express");
const auth = require("../Middleware/Auth");
const EngineController = require("../Controllers/engineInformationController");

const router = express.Router();

router.post(
  "/",
  auth(["Admin","Employee","Client"]),
  EngineController.create
);

router.get(
  "/:bid",
  auth(["Admin","Employee","Client"]),
  EngineController.getByBoat
);

router.put(
  "/:bid",
  auth(["Admin","Employee","Client"]),
  EngineController.update
);

router.delete(
  "/:bid",
  auth(["Admin","Employee"]),
  EngineController.remove
);

module.exports = router;
