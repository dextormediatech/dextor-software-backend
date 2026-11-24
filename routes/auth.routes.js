import express from "express";
import {
  registerUser,
  loginUser,
  getUsers,
  refreshAccessToken,
  logoutUser,
  updateUser,
  deleteUser,
} from "../controllers/auth.controllers.js";
import { authenticateUser, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", authenticateUser, authorizeRoles("owner"), registerUser);
router.post("/login", loginUser);
router.get("/", authenticateUser, authorizeRoles("owner"), getUsers);
router.put("/:id", authenticateUser, authorizeRoles("owner"), updateUser);
router.delete("/:id", authenticateUser, authorizeRoles("owner"), deleteUser);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

export default router;
