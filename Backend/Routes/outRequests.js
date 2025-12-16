const express = require("express");
const auth = require("../Middleware/Auth");
const OutRequestsController = require("../Controllers/outRequestsController");

const router = express.Router();

router.post(
  "/",
  auth(["Admin","Employee","Client"]),
  OutRequestsController.create
);

router.get(
  "/",
  auth(["Admin","Employee"]),
  OutRequestsController.listAll
);

router.get(
  "/my",
  auth(["Client","Admin","Employee"]),
  OutRequestsController.listMine
);

router.put(
  "/:id/approve",
  auth(["Admin","Employee"]),
  OutRequestsController.approve
);

router.put(
  "/:id/reject",
  auth(["Admin","Employee"]),
  OutRequestsController.reject
);

router.put(
  "/:id/cancel",
  auth(["Admin","Employee","Client"]),
  OutRequestsController.cancel
);

module.exports = router;
