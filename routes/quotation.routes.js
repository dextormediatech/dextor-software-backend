import express from "express";
import {
  fetchQuotations,
  getNextQuotationNumber,
  createQuotation,
  updateQuotation,
  deleteQuotation,
} from "../controllers/quotation.controllers.js";
import {
  authenticateUser,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateUser, authorizeRoles("owner"), fetchQuotations);
router.get("/next-number", authenticateUser, authorizeRoles("owner"), getNextQuotationNumber);
router.post("/", authenticateUser, authorizeRoles("owner"), createQuotation);
router.put("/:id", authenticateUser, authorizeRoles("owner"), updateQuotation);
router.delete("/:id", authenticateUser, authorizeRoles("owner"), deleteQuotation);

export default router;
