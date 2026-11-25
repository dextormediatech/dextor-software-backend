import express from "express";
import {
  addServices,
  fetchServices,
  updateService,
  deleteService,
} from "../controllers/service.controllers.js";
import {
  authenticateUser,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateUser, authorizeRoles("owner"), fetchServices);
router.post("/", authenticateUser, authorizeRoles("owner"), addServices);
router.put("/:id", authenticateUser, authorizeRoles("owner"), updateService);
router.delete("/:id", authenticateUser, authorizeRoles("owner"), deleteService);

export default router;
