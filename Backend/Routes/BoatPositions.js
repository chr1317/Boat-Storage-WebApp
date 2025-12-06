// Backend/Routes/BoatPositions.js
const express = require("express");
const auth = require("../Middleware/Auth");
const BoatPositionsController = require("../Controllers/boatPositionsController");

const router = express.Router();

router.post(
  "/",
  auth(["Admin","Employee"]),
  BoatPositionsController.create
);

router.put(
  "/:id",
  auth(["Admin","Employee"]),
  BoatPositionsController.update
);

router.delete(
  "/:id",
  auth(["Admin","Employee"]),
  BoatPositionsController.remove
);

router.get(
  "/hall/:bhid",
  auth(["Admin","Employee"]),
  BoatPositionsController.listByHall
);

router.get(
  "/boat/:bid",
  auth(["Admin","Employee","Client"]),
  BoatPositionsController.getByBoat
);

router.get(
  "/hall/:bhid/simulate",
  auth(["Admin","Employee"]),
  BoatPositionsController.simulate
);

router.post(
  "/hall/:bhid/optimize",
  auth(["Admin","Employee"]),
  BoatPositionsController.optimize
);

module.exports = router;
