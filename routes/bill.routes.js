import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  getNextBillNumber,
  fetchBills,
  createBill,
  updateBill,
  deleteBill,
} from "../controllers/bill.controllers.js";

const router = express.Router();

router.get("/next-number", authenticateUser, authorizeRoles("owner"), getNextBillNumber);
router.get("/", authenticateUser, authorizeRoles("owner"), fetchBills);
router.post("/", authenticateUser, authorizeRoles("owner"), createBill);
router.put("/:id", authenticateUser, authorizeRoles("owner"), updateBill);
router.delete("/:id", authenticateUser, authorizeRoles("owner"), deleteBill);

export default router;
