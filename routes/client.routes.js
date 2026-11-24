import express from "express";
import {
  fetchClients,
  getClientById,
  onboardNewClient,
  updateClient,
  deleteClient,
} from "../controllers/client.controllers.js";
import {
  authenticateUser,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateUser, fetchClients);
router.get("/:id", authenticateUser, getClientById);
router.post("/", authenticateUser, authorizeRoles("owner"), onboardNewClient);
router.put("/:id", authenticateUser, authorizeRoles("owner"), updateClient);
router.delete("/:id", authenticateUser, authorizeRoles("owner"), deleteClient);

export default router;
