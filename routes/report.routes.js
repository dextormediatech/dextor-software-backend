import express from "express";
import {
  getRevenueReport,
  getOutstandingReport,
} from "../controllers/report.controllers.js";
import { authenticateUser, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

// Both reports are accessible by owner
router.get("/revenue", authenticateUser, authorizeRoles("owner"), getRevenueReport);
router.get("/outstanding", authenticateUser, authorizeRoles("owner"), getOutstandingReport);

export default router;
