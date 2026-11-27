import mongoose from "mongoose";
import Quotation from "../models/quotations.model.js";
import { uploadQuotationPdf } from "../utils/cloudinary.js";

const getQuotationPrefix = (serviceDepartment = "", serviceName = "") => {
  const combined = `${serviceDepartment} ${serviceName}`.toLowerCase();
  if (combined.includes("marketing")) return "DM";
  if (
    combined.includes("development") ||
    combined.includes("software") ||
    combined.includes("web") ||
    combined.includes("app")
  ) {
    return "SD";
  }
  return "DM";
};

const computeNextQuotationNumber = async (prefix) => {
  const regex = new RegExp(`^${prefix}-(\\d+)$`, "i");
  const existing = await Quotation.find({ quotationNumber: regex }).select("quotationNumber");

  let maxNum = 0;
  for (const doc of existing) {
    const match = doc.quotationNumber?.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }

  const next = maxNum + 1;
  return `${prefix}-${String(next).padStart(2, "0")}`;
};

export const getNextQuotationNumber = async (req, res) => {
  try {
    const { department = "", serviceName = "" } = req.query;
    const prefix = getQuotationPrefix(department, serviceName);
    const quotationNumber = await computeNextQuotationNumber(prefix);

    return res.status(200).json({
      success: true,
      data: { quotationNumber, prefix },
    });
  } catch (error) {
    console.error("Next quotation number error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const fetchQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });
    if (quotations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No quotations found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quotations fetched",
      data: quotations,
    });
  } catch (error) {
    console.error("Fetch quotations error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const createQuotation = async (req, res) => {
  try {
    const {
      quotationNumber,
      clientId,
      clientDetails,
      serviceId,
      serviceName,
      serviceDepartment,
      title,
      items,
      includeDeliverables,
      deliverables,
      includeCoordinator,
      notes,
      terms,
      signatures,
      pdfBase64,
      status,
    } = req.body;

    if (
      !clientDetails?.organizationName?.trim() ||
      !clientDetails?.clientName?.trim() ||
      !clientDetails?.clientPhone?.trim() ||
      !serviceName?.trim() ||
      !title?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Client details, service, quotation title, and at least one item are required",
      });
    }

    const parseItemAmount = (val) => {
      const str = String(val ?? "").trim();
      if (!str) return 0;
      const num = Number(str);
      return Number.isNaN(num) ? str : num;
    };

    const normalizedItems = items.map((item) => ({
      title: String(item.title || "").trim(),
      description: String(item.description || "").trim(),
      billing: String(item.billing || "One-Time").trim(),
      amount: parseItemAmount(item.amount),
    }));

    const normalizedDeliverables =
      includeDeliverables && Array.isArray(deliverables)
        ? deliverables
            .filter((d) => d?.title?.trim())
            .map((d) => ({
              title: String(d.title || "").trim(),
              description: String(d.description || "").trim(),
            }))
        : [];

    const totalAmount = normalizedItems
      .filter((item) => item.billing.toLowerCase() === "one-time" && typeof item.amount === "number")
      .reduce((sum, item) => sum + item.amount, 0);
    const prefix = getQuotationPrefix(serviceDepartment, serviceName);
    const finalNumber =
      quotationNumber?.trim() && /^(DM|SD)-\d+$/i.test(quotationNumber.trim())
        ? quotationNumber.trim().toUpperCase()
        : await computeNextQuotationNumber(prefix);

    const safeClientName = (clientDetails.organizationName || clientDetails.clientName || "client")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const pdfFileName = `${safeClientName}_quotation`;

    let pdfUrl = "";
    let cloudinaryPublicId = "";
    if (pdfBase64) {
      try {
        const uploaded = await uploadQuotationPdf(pdfBase64, pdfFileName);
        if (uploaded) {
          pdfUrl = uploaded.secure_url || "";
          cloudinaryPublicId = uploaded.public_id || "";
        }
      } catch (uploadErr) {
        console.error(
          "Quotation PDF upload failed (saving quotation without cloud URL):",
          uploadErr?.message || uploadErr
        );
      }
    }

    const newQuotation = await Quotation.create({
      quotationNumber: finalNumber,
      clientId: clientId && mongoose.Types.ObjectId.isValid(clientId) ? clientId : undefined,
      clientDetails: {
        organizationName: clientDetails.organizationName.trim(),
        clientName: clientDetails.clientName.trim(),
        clientPhone: clientDetails.clientPhone.trim(),
        clientEmail: (clientDetails.clientEmail || "").trim(),
      },
      serviceId: serviceId && mongoose.Types.ObjectId.isValid(serviceId) ? serviceId : undefined,
      serviceName: serviceName.trim(),
      title: title.trim(),
      items: normalizedItems,
      totalAmount,
      includeDeliverables: Boolean(includeDeliverables),
      deliverables: normalizedDeliverables,
      includeCoordinator: Boolean(includeCoordinator),
      notes: (notes || "").trim(),
      terms: (terms || "").trim(),
      signatures: {
        authorizedPerson: {
          name: (signatures?.authorizedPerson?.name || "").trim(),
          signatureSvg: signatures?.authorizedPerson?.signatureSvg || "",
        },
        coordinator: {
          name: (signatures?.coordinator?.name || "").trim(),
          signatureSvg: signatures?.coordinator?.signatureSvg || "",
        },
        clientApprover: {
          name: "",
        },
      },
      pdfUrl,
      cloudinaryPublicId,
      status: status || "Sent",
    });

    return res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      data: newQuotation,
    });
  } catch (error) {
    console.error("Create quotation error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid quotation ID" });
    }

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    const {
      clientDetails,
      serviceName,
      title,
      items,
      includeDeliverables,
      deliverables,
      includeCoordinator,
      notes,
      terms,
      signatures,
      pdfBase64,
      status,
    } = req.body;

    if (clientDetails) {
      quotation.clientDetails = {
        organizationName: (clientDetails.organizationName ?? quotation.clientDetails.organizationName).trim(),
        clientName: (clientDetails.clientName ?? quotation.clientDetails.clientName).trim(),
        clientPhone: (clientDetails.clientPhone ?? quotation.clientDetails.clientPhone).trim(),
        clientEmail: (clientDetails.clientEmail ?? quotation.clientDetails.clientEmail).trim(),
      };
    }
    if (serviceName !== undefined && serviceName.trim()) quotation.serviceName = serviceName.trim();
    if (title !== undefined && title.trim()) quotation.title = title.trim();
    if (Array.isArray(items) && items.length > 0) {
      quotation.items = items.map((item) => {
        const str = String(item.amount ?? "").trim();
        const num = Number(str);
        return {
          title: String(item.title || "").trim(),
          description: String(item.description || "").trim(),
          billing: String(item.billing || "One-Time").trim(),
          amount: str && !Number.isNaN(num) ? num : str || 0,
        };
      });
      quotation.totalAmount = quotation.items
        .filter((item) => item.billing.toLowerCase() === "one-time" && typeof item.amount === "number")
        .reduce((sum, item) => sum + item.amount, 0);
    }
    if (includeDeliverables !== undefined) {
      quotation.includeDeliverables = Boolean(includeDeliverables);
    }
    if (Array.isArray(deliverables)) {
      quotation.deliverables = quotation.includeDeliverables
        ? deliverables
            .filter((d) => d?.title?.trim())
            .map((d) => ({
              title: String(d.title || "").trim(),
              description: String(d.description || "").trim(),
            }))
        : [];
    }
    if (includeCoordinator !== undefined) {
      quotation.includeCoordinator = Boolean(includeCoordinator);
    }
    if (notes !== undefined) quotation.notes = notes.trim();
    if (terms !== undefined) quotation.terms = terms.trim();
    if (status && ["Draft", "Sent", "Approved", "Rejected"].includes(status)) {
      quotation.status = status;
    }
    if (signatures) {
      if (signatures.authorizedPerson) {
        quotation.signatures.authorizedPerson = {
          name: (signatures.authorizedPerson.name || "").trim(),
          signatureSvg: signatures.authorizedPerson.signatureSvg || "",
        };
      }
      if (signatures.coordinator) {
        quotation.signatures.coordinator = {
          name: (signatures.coordinator.name || "").trim(),
          signatureSvg: signatures.coordinator.signatureSvg || "",
        };
      }
    }

    if (pdfBase64) {
      const safeClientName = (quotation.clientDetails.organizationName || "client")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      try {
        const uploaded = await uploadQuotationPdf(pdfBase64, `${safeClientName}_quotation`);
        if (uploaded) {
          quotation.pdfUrl = uploaded.secure_url || quotation.pdfUrl;
          quotation.cloudinaryPublicId = uploaded.public_id || quotation.cloudinaryPublicId;
        }
      } catch (uploadErr) {
        console.error(
          "Quotation PDF upload failed during update (continuing):",
          uploadErr?.message || uploadErr
        );
      }
    }

    await quotation.save();

    return res.status(200).json({
      success: true,
      message: "Quotation updated successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("Update quotation error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid quotation ID" });
    }

    const deleted = await Quotation.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Quotation deleted successfully",
      data: { id: deleted._id },
    });
  } catch (error) {
    console.error("Delete quotation error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};
