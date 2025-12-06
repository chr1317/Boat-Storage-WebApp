// Backend/Routes/BoatHalls.js
const express = require("express");
const auth = require("../Middleware/Auth");
const BoatHallsController = require("../Controllers/boatHallsController");

const router = express.Router();

router.post(
  "/",
  auth(["Admin", "Employee"]),
  BoatHallsController.create
);

router.get(
  "/",
  auth(["Admin", "Employee"]),
  BoatHallsController.list
);

router.get(
  "/:id",
  auth(["Admin", "Employee"]),
  BoatHallsController.getOne
);

router.put(
  "/:id",
  auth(["Admin", "Employee"]),
  BoatHallsController.update
);

router.delete(
  "/:id",
  auth(["Admin", "Employee"]),
  BoatHallsController.remove
);

module.exports = router;
