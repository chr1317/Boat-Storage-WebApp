// Backend/Routes/Dimensions.js
const express = require("express");
const auth = require("../Middleware/Auth");
const DimensionsController = require("../Controllers/boatDimensionsController");

const router = express.Router();

// POST /api/dimensions
router.post(
  "/",
  auth(["Admin", "Employee", "Client"]),
  DimensionsController.create
);

// GET /api/dimensions/:bid
router.get(
  "/:bid",
  auth(["Admin", "Employee", "Client"]),
  DimensionsController.getByBid
);

// PUT /api/dimensions/:bid
router.put(
  "/:bid",
  auth(["Admin", "Employee", "Client"]),
  DimensionsController.updateByBid
);

// DELETE /api/dimensions/:bid
router.delete(
  "/:bid",
  auth(["Admin", "Employee"]),
  DimensionsController.deleteByBid
);

module.exports = router;
