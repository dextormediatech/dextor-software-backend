import mongoose from "mongoose";
import Invoice from "../models/invoices.model.js";
import { uploadQuotationPdf } from "../utils/cloudinary.js";

const computeNextInvoiceNumber = async () => {
  const regex = /^INV-(\d+)$/i;
  const existing = await Invoice.find({ invoiceNumber: regex }).select("invoiceNumber");
  let maxNum = 0;
  for (const doc of existing) {
    const match = doc.invoiceNumber?.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  return `INV-${String(maxNum + 1).padStart(2, "0")}`;
};

export const getNextInvoiceNumber = async (req, res) => {
  try {
    const invoiceNumber = await computeNextInvoiceNumber();
    return res.status(200).json({ success: true, data: { invoiceNumber } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const fetchInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    if (invoices.length === 0) {
      return res.status(404).json({ success: false, message: "No invoices found" });
    }
    return res.status(200).json({
      success: true,
      message: "Invoices fetched",
      data: invoices,
    });
  } catch (error) {
    console.error("Fetch invoices error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      quotationId,
      quotationNumber,
      clientId,
      clientDetails,
      title,
      items,
      dueDate,
      notes,
      pdfBase64,
    } = req.body;

    if (
      !clientDetails?.organizationName?.trim() ||
      !clientDetails?.clientName?.trim() ||
      !clientDetails?.clientPhone?.trim() ||
      !title?.trim() ||
      !dueDate ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Client details, title, dueDate, and at least one item are required",
      });
    }

    const normalizedItems = items.map((it) => ({
      title: String(it.title || "").trim(),
      description: String(it.description || "").trim(),
      amount: Math.max(Number(it.amount) || 0, 0),
    }));

    const totalAmount = normalizedItems.reduce((sum, it) => sum + it.amount, 0);
    const finalNumber =
      invoiceNumber?.trim() && /^INV-\d+$/i.test(invoiceNumber.trim())
        ? invoiceNumber.trim().toUpperCase()
        : await computeNextInvoiceNumber();

    const safeClientName = (clientDetails.organizationName || clientDetails.clientName || "client")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    let pdfUrl = "";
    let cloudinaryPublicId = "";
    if (pdfBase64) {
      const uploaded = await uploadQuotationPdf(
        pdfBase64,
        `${safeClientName}_invoice`,
        "dextor_mediatech/invoices"
      );
      if (uploaded) {
        pdfUrl = uploaded.secure_url || "";
        cloudinaryPublicId = uploaded.public_id || "";
      }
    }

    const newInvoice = await Invoice.create({
      invoiceNumber: finalNumber,
      quotationId: quotationId && mongoose.Types.ObjectId.isValid(quotationId) ? quotationId : undefined,
      quotationNumber: (quotationNumber || "").trim(),
      clientId: clientId && mongoose.Types.ObjectId.isValid(clientId) ? clientId : undefined,
      clientDetails: {
        organizationName: clientDetails.organizationName.trim(),
        clientName: clientDetails.clientName.trim(),
        clientPhone: clientDetails.clientPhone.trim(),
        clientEmail: (clientDetails.clientEmail || "").trim(),
      },
      title: title.trim(),
      items: normalizedItems,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      dueDate,
      notes: (notes || "").trim(),
      status: "Unpaid",
      pdfUrl,
      cloudinaryPublicId,
    });

    return res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: newInvoice,
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid invoice ID" });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const { clientDetails, title, items, dueDate, notes, pdfBase64 } = req.body;

    if (clientDetails) {
      invoice.clientDetails = {
        organizationName: (clientDetails.organizationName ?? invoice.clientDetails.organizationName).trim(),
        clientName: (clientDetails.clientName ?? invoice.clientDetails.clientName).trim(),
        clientPhone: (clientDetails.clientPhone ?? invoice.clientDetails.clientPhone).trim(),
        clientEmail: (clientDetails.clientEmail ?? invoice.clientDetails.clientEmail).trim(),
      };
    }
    if (title !== undefined && title.trim()) invoice.title = title.trim();
    if (dueDate !== undefined) invoice.dueDate = dueDate;
    if (notes !== undefined) invoice.notes = notes.trim();

    if (Array.isArray(items) && items.length > 0) {
      invoice.items = items.map((it) => ({
        title: String(it.title || "").trim(),
        description: String(it.description || "").trim(),
        amount: Math.max(Number(it.amount) || 0, 0),
      }));
      invoice.totalAmount = invoice.items.reduce((sum, it) => sum + it.amount, 0);
      invoice.balanceAmount = Math.max(invoice.totalAmount - (invoice.paidAmount || 0), 0);
      invoice.status =
        invoice.balanceAmount === 0
          ? "Paid"
          : (invoice.paidAmount || 0) > 0
            ? "Partial"
            : "Unpaid";
    }

    if (pdfBase64) {
      const safeClientName = (invoice.clientDetails.organizationName || "client")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const uploaded = await uploadQuotationPdf(
        pdfBase64,
        `${safeClientName}_invoice`,
        "dextor_mediatech/invoices"
      );
      if (uploaded) {
        invoice.pdfUrl = uploaded.secure_url || invoice.pdfUrl;
        invoice.cloudinaryPublicId = uploaded.public_id || invoice.cloudinaryPublicId;
      }
    }

    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Update invoice error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid invoice ID" });
    }
    const deleted = await Invoice.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
      data: { id: deleted._id },
    });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};
