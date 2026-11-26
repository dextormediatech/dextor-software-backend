import express from "express";
import {
  fetchInvoices,
  getNextInvoiceNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from "../controllers/invoice.controllers.js";
import { authenticateUser, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateUser, authorizeRoles("owner"), fetchInvoices);
router.get("/next-number", authenticateUser, authorizeRoles("owner"), getNextInvoiceNumber);
router.post("/", authenticateUser, authorizeRoles("owner"), createInvoice);
router.put("/:id", authenticateUser, authorizeRoles("owner"), updateInvoice);
router.delete("/:id", authenticateUser, authorizeRoles("owner"), deleteInvoice);

export default router;
