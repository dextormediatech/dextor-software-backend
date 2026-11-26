import express from "express";
import {
  fetchReceipts,
  getNextReceiptNumber,
  createReceipt,
  deleteReceipt,
} from "../controllers/receipt.controllers.js";
import { authenticateUser, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateUser, authorizeRoles("owner"), fetchReceipts);
router.get("/next-number", authenticateUser, authorizeRoles("owner"), getNextReceiptNumber);
router.post("/", authenticateUser, authorizeRoles("owner"), createReceipt);
router.delete("/:id", authenticateUser, authorizeRoles("owner"), deleteReceipt);

export default router;
