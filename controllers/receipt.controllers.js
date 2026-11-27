import mongoose from "mongoose";
import Receipt from "../models/receipts.model.js";
import Invoice from "../models/invoices.model.js";
import { uploadQuotationPdf } from "../utils/cloudinary.js";

const computeNextReceiptNumber = async () => {
  const regex = /^REC-(\d+)$/i;
  const existing = await Receipt.find({ receiptNumber: regex }).select("receiptNumber");
  let maxNum = 0;
  for (const doc of existing) {
    const match = doc.receiptNumber?.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  return `REC-${String(maxNum + 1).padStart(2, "0")}`;
};

export const getNextReceiptNumber = async (req, res) => {
  try {
    const receiptNumber = await computeNextReceiptNumber();
    return res.status(200).json({ success: true, data: { receiptNumber } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const fetchReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.find().sort({ createdAt: -1 });
    if (receipts.length === 0) {
      return res.status(404).json({ success: false, message: "No receipts found" });
    }
    return res.status(200).json({
      success: true,
      message: "Receipts fetched",
      data: receipts,
    });
  } catch (error) {
    console.error("Fetch receipts error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const createReceipt = async (req, res) => {
  try {
    const {
      receiptNumber,
      invoiceId,
      invoiceNumber,
      clientId,
      clientDetails,
      paymentDate,
      paymentAmount,
      paymentMode,
      transactionId,
      chequeNo,
      partPayDetails,
      notes,
      pdfBase64,
    } = req.body;

    const amt = Number(paymentAmount) || 0;

    if (
      !clientDetails?.organizationName?.trim() ||
      !clientDetails?.clientName?.trim() ||
      !clientDetails?.clientPhone?.trim() ||
      !paymentMode ||
      amt <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Client details, valid paymentAmount, and paymentMode are required",
      });
    }

    let invoiceTotal = 0;
    let previousPaid = 0;
    let balanceAmount = 0;
    let resolvedInvoiceNumber = (invoiceNumber || "").trim();

    if (invoiceId && mongoose.Types.ObjectId.isValid(invoiceId)) {
      const invoice = await Invoice.findById(invoiceId);
      if (invoice) {
        invoiceTotal = invoice.totalAmount || 0;
        previousPaid = invoice.paidAmount || 0;
        const newPaid = previousPaid + amt;
        balanceAmount = Math.max(invoiceTotal - newPaid, 0);
        resolvedInvoiceNumber = invoice.invoiceNumber;

        invoice.paidAmount = newPaid;
        invoice.balanceAmount = balanceAmount;
        invoice.status =
          balanceAmount === 0 ? "Paid" : newPaid > 0 ? "Partial" : "Unpaid";
        await invoice.save();
      }
    }

    const finalNumber =
      receiptNumber?.trim() && /^REC-\d+$/i.test(receiptNumber.trim())
        ? receiptNumber.trim().toUpperCase()
        : await computeNextReceiptNumber();

    const safeClientName = (clientDetails.organizationName || clientDetails.clientName || "client")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    let pdfUrl = "";
    let cloudinaryPublicId = "";
    if (pdfBase64) {
      try {
        const uploaded = await uploadQuotationPdf(
          pdfBase64,
          `${safeClientName}_receipt`,
          "dextor_mediatech/receipts"
        );
        if (uploaded) {
          pdfUrl = uploaded.secure_url || "";
          cloudinaryPublicId = uploaded.public_id || "";
        }
      } catch (uploadErr) {
        console.error(
          "Receipt PDF upload failed (saving receipt without cloud URL):",
          uploadErr?.message || uploadErr
        );
      }
    }

    const newReceipt = await Receipt.create({
      receiptNumber: finalNumber,
      invoiceId: invoiceId && mongoose.Types.ObjectId.isValid(invoiceId) ? invoiceId : undefined,
      invoiceNumber: resolvedInvoiceNumber,
      clientId: clientId && mongoose.Types.ObjectId.isValid(clientId) ? clientId : undefined,
      clientDetails: {
        organizationName: clientDetails.organizationName.trim(),
        clientName: clientDetails.clientName.trim(),
        clientPhone: clientDetails.clientPhone.trim(),
        clientEmail: (clientDetails.clientEmail || "").trim(),
      },
      paymentDate: paymentDate || new Date(),
      paymentAmount: amt,
      invoiceTotal,
      previousPaid,
      balanceAmount,
      paymentMode,
      transactionId: (transactionId || "").trim(),
      chequeNo: (chequeNo || "").trim(),
      partPayDetails:
        paymentMode === "Part-Pay" && partPayDetails
          ? {
              cashAmount: Number(partPayDetails.cashAmount) || 0,
              secondaryMode: partPayDetails.secondaryMode || "",
              secondaryAmount: Number(partPayDetails.secondaryAmount) || 0,
              referenceNo: (partPayDetails.referenceNo || "").trim(),
            }
          : undefined,
      notes: (notes || "").trim(),
      pdfUrl,
      cloudinaryPublicId,
    });

    return res.status(201).json({
      success: true,
      message: "Payment receipt created successfully",
      data: newReceipt,
    });
  } catch (error) {
    console.error("Create receipt error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid receipt ID" });
    }

    const receipt = await Receipt.findByIdAndDelete(id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: "Receipt not found" });
    }

    // Reverse payment on linked invoice if applicable
    if (receipt.invoiceId && mongoose.Types.ObjectId.isValid(receipt.invoiceId)) {
      const invoice = await Invoice.findById(receipt.invoiceId);
      if (invoice) {
        const nextPaid = Math.max((invoice.paidAmount || 0) - (receipt.paymentAmount || 0), 0);
        const nextBal = Math.max((invoice.totalAmount || 0) - nextPaid, 0);
        invoice.paidAmount = nextPaid;
        invoice.balanceAmount = nextBal;
        invoice.status = nextBal === 0 && invoice.totalAmount > 0 ? "Paid" : nextPaid > 0 ? "Partial" : "Unpaid";
        await invoice.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Receipt deleted successfully",
      data: { id: receipt._id },
    });
  } catch (error) {
    console.error("Delete receipt error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};
