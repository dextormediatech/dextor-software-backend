import mongoose from "mongoose";
import Lead from "../models/leads.model.js";

const ALLOWED_SERVICES = ["Software Development", "Social Media Marketing"];

const normalizeServices = (services, fallbackSingle) => {
  let list = [];
  if (Array.isArray(services)) {
    list = services;
  } else if (typeof services === "string" && services.trim()) {
    list = [services.trim()];
  } else if (typeof fallbackSingle === "string" && fallbackSingle.trim()) {
    list = [fallbackSingle.trim()];
  }

  const filtered = list.filter((s) => ALLOWED_SERVICES.includes(s));
  return filtered.length > 0 ? filtered : ["Software Development"];
};

export const fetchLeads = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && ["On hold", "Client"].includes(status)) {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { organizationName: { $regex: q, $options: "i" } },
        { ownerName: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    if (leads.length === 0) {
      return res.status(404).json({ success: false, message: "No leads found" });
    }

    return res.status(200).json({
      success: true,
      message: "Leads fetched",
      data: leads,
    });
  } catch (error) {
    console.error("Fetch leads error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const createLead = async (req, res) => {
  try {
    const {
      organizationName,
      ownerName,
      phone,
      email,
      interestedServices,
      interestedService,
      status,
    } = req.body;

    if (!organizationName?.trim() || !ownerName?.trim() || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Organization name, owner name, and phone number are required",
      });
    }

    const services = normalizeServices(interestedServices, interestedService);
    const leadStatus = ["On hold", "Client"].includes(status) ? status : "On hold";

    const lead = await Lead.create({
      organizationName: organizationName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      email: (email || "").trim(),
      interestedServices: services,
      status: leadStatus,
    });

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Create lead error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid lead ID" });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const {
      organizationName,
      ownerName,
      phone,
      email,
      interestedServices,
      interestedService,
      status,
    } = req.body;

    if (organizationName !== undefined && organizationName.trim()) {
      lead.organizationName = organizationName.trim();
    }
    if (ownerName !== undefined && ownerName.trim()) {
      lead.ownerName = ownerName.trim();
    }
    if (phone !== undefined && phone.trim()) {
      lead.phone = phone.trim();
    }
    if (email !== undefined) {
      lead.email = String(email || "").trim();
    }
    if (interestedServices !== undefined || interestedService !== undefined) {
      lead.interestedServices = normalizeServices(interestedServices, interestedService);
    }
    if (status && ["On hold", "Client"].includes(status)) {
      lead.status = status;
    }

    await lead.save();

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Update lead error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid lead ID" });
    }

    const deleted = await Lead.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("Delete lead error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};
