import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  fetchPipelines,
  createPipeline,
  updatePipeline,
  deletePipeline,
} from "../controllers/pipeline.controllers.js";

const router = express.Router();

router.get("/", authenticateUser, authorizeRoles("owner"), fetchPipelines);
router.post("/", authenticateUser, authorizeRoles("owner"), createPipeline);
router.put("/:id", authenticateUser, authorizeRoles("owner"), updatePipeline);
router.delete("/:id", authenticateUser, authorizeRoles("owner"), deletePipeline);

export default router;
