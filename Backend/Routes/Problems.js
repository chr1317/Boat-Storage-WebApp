const express = require("express");
const auth = require("../Middleware/Auth");
const ProblemsController = require("../Controllers/problemsController");

const router = express.Router();

// LIST
router.get("/", auth(["Admin","Employee","Client"]), ProblemsController.list);

// GET ONE
router.get("/:id", auth(["Admin","Employee","Client"]), ProblemsController.getOne);

// CREATE (with optional autoWork)
router.post("/", auth(["Admin","Employee","Client"]), ProblemsController.create);

// ADD WORK TO PROBLEM
router.post("/:id/work", auth(["Admin","Employee"]), ProblemsController.addWork);

// UPDATE STATUS
router.put("/:id/status", auth(["Admin","Employee"]), ProblemsController.updateStatus);

// UPDATE PROBLEM (client/staff)
router.put("/:id", auth(["Admin","Employee","Client"]), ProblemsController.update);

router.put("/:id/approve", auth(["Client"]), ProblemsController.approve);


module.exports = router;
