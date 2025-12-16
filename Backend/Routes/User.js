const express = require("express");
const auth = require("../Middleware/Auth");
const UserController = require("../Controllers/userController");

const router = express.Router();

router.get("/me", auth(), UserController.getMe);
router.put("/me", auth(), UserController.updateMe);

router.get("/", auth(["Admin", "Employee"]), UserController.list);
router.post("/", auth(["Admin"]), UserController.create);

router.get("/:id", auth(), UserController.getOne);
router.put("/:id", auth(), UserController.update);
router.put("/:id/password", auth(), UserController.updatePassword);
router.delete("/:id", auth(["Admin"]), UserController.delete);

router.put("/:id/set-password", UserController.setPassword);

module.exports = router;
