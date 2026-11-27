import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  fetchLeads,
  createLead,
  updateLead,
  deleteLead,
} from "../controllers/lead.controllers.js";

const router = express.Router();

router.get("/", authenticateUser, authorizeRoles("owner"), fetchLeads);
router.post("/", authenticateUser, authorizeRoles("owner"), createLead);
router.put("/:id", authenticateUser, authorizeRoles("owner"), updateLead);
router.delete("/:id", authenticateUser, authorizeRoles("owner"), deleteLead);

export default router;
