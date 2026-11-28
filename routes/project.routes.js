import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controllers.js";

const router = express.Router();

router.get("/", authenticateUser, authorizeRoles("owner"), fetchProjects);
router.post("/", authenticateUser, authorizeRoles("owner"), createProject);
router.put("/:id", authenticateUser, authorizeRoles("owner"), updateProject);
router.delete("/:id", authenticateUser, authorizeRoles("owner"), deleteProject);

export default router;
