const express = require("express");
const auth = require("../Middleware/Auth");
const DimensionsController = require("../Controllers/boatDimensionsController");

const router = express.Router();

router.post(
  "/",
  auth(["Admin", "Employee", "Client"]),
  DimensionsController.create
);

router.get(
  "/:bid",
  auth(["Admin", "Employee", "Client"]),
  DimensionsController.getByBid
);

router.put(
  "/:bid",
  auth(["Admin", "Employee", "Client"]),
  DimensionsController.updateByBid
);

router.delete(
  "/:bid",
  auth(["Admin", "Employee"]),
  DimensionsController.deleteByBid
);

module.exports = router;
