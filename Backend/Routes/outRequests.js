// Backend/Routes/outRequests.js
const express = require("express");
const auth = require("../Middleware/Auth");
const OutRequestsController = require("../controllers/outRequestsController");

const router = express.Router();

// POST /out-requests
router.post(
  "/",
  auth(["Admin","Employee","Client"]),
  OutRequestsController.create
);

// GET /out-requests (admin/staff)
router.get(
  "/",
  auth(["Admin","Employee"]),
  OutRequestsController.listAll
);

// GET /out-requests/my
router.get(
  "/my",
  auth(["Client","Admin","Employee"]),
  OutRequestsController.listMine
);

// APPROVE
router.put(
  "/:id/approve",
  auth(["Admin","Employee"]),
  OutRequestsController.approve
);

// REJECT
router.put(
  "/:id/reject",
  auth(["Admin","Employee"]),
  OutRequestsController.reject
);

// CANCEL
router.put(
  "/:id/cancel",
  auth(["Admin","Employee","Client"]),
  OutRequestsController.cancel
);

module.exports = router;
