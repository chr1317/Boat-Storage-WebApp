// Backend/Routes/Engine.js
const express = require("express");
const auth = require("../Middleware/Auth");
const EngineController = require("../Controllers/engineInformationController");

const router = express.Router();

// POST /engine  — create engine info for a boat (one per BID)
router.post(
  "/",
  auth(["Admin","Employee","Client"]),
  EngineController.create
);

// GET /engine/:bid — get engine info by boat id
router.get(
  "/:bid",
  auth(["Admin","Employee","Client"]),
  EngineController.getByBoat
);

// PUT /engine/:bid — update engine info by boat id
router.put(
  "/:bid",
  auth(["Admin","Employee","Client"]),
  EngineController.update
);

// DELETE /engine/:bid — staff only
router.delete(
  "/:bid",
  auth(["Admin","Employee"]),
  EngineController.remove
);

module.exports = router;
