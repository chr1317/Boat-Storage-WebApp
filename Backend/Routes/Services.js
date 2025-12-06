const express = require("express");
const auth = require("../Middleware/Auth");
const ServicesController = require("../Controllers/servicesController");

const router = express.Router();

router.post("/", auth(["Admin","Employee"]), ServicesController.create);
router.get("/", auth(["Admin","Employee","Client"]), ServicesController.list);
router.get("/:id", auth(["Admin","Employee","Client"]), ServicesController.getOne);
router.put("/:id", auth(["Admin","Employee"]), ServicesController.update);
router.delete("/:id", auth(["Admin","Employee"]), ServicesController.delete);

module.exports = router;
