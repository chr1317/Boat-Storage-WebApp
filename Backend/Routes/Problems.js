const express = require("express");
const auth = require("../Middleware/Auth");
const ProblemsController = require("../Controllers/problemsController");

const router = express.Router();

router.get("/", auth(["Admin","Employee","Client"]), ProblemsController.list);

router.get("/:id", auth(["Admin","Employee","Client"]), ProblemsController.getOne);

router.post("/", auth(["Admin","Employee","Client"]), ProblemsController.create);

router.post("/:id/work", auth(["Admin","Employee"]), ProblemsController.addWork);

router.put("/:id/status", auth(["Admin","Employee"]), ProblemsController.updateStatus);

router.put("/:id", auth(["Admin","Employee","Client"]), ProblemsController.update);

router.put("/:id/approve", auth(["Client"]), ProblemsController.approve);


module.exports = router;
