import mongoose from "mongoose";
import Project from "../models/projects.model.js";
import Client from "../models/clients.model.js";

const ALLOWED_STATUS = ["On hold", "In process", "Completed"];
const ALLOWED_PAYMENT_STATUS = ["Unpaid", "Partial", "Paid"];

const normalizePayment = (paymentStatus, amount, paymentAmount) => {
  const cleanStatus = ALLOWED_PAYMENT_STATUS.includes(paymentStatus)
    ? paymentStatus
    : "Unpaid";
  const total = Math.max(0, Number(amount) || 0);

  if (cleanStatus === "Unpaid") {
    return { paymentStatus: "Unpaid", paymentAmount: 0 };
  }

  if (cleanStatus === "Paid") {
    const paid = Number(paymentAmount);
    return {
      paymentStatus: "Paid",
      paymentAmount: Number.isFinite(paid) && paid > 0 ? paid : total,
    };
  }

  // Partial
  const partialPaid = Math.max(0, Number(paymentAmount) || 0);
  return {
    paymentStatus: "Partial",
    paymentAmount: partialPaid,
  };
};

export const fetchProjects = async (req, res) => {
  try {
    const { status, paymentStatus, clientId, search } = req.query;
    const filter = {};

    if (status && ALLOWED_STATUS.includes(status)) {
      filter.status = status;
    }

    if (paymentStatus && ALLOWED_PAYMENT_STATUS.includes(paymentStatus)) {
      filter.paymentStatus = paymentStatus;
    }

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.clientId = clientId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { projectTitle: { $regex: q, $options: "i" } },
        { service: { $regex: q, $options: "i" } },
        { "clientDetails.organizationName": { $regex: q, $options: "i" } },
        { "clientDetails.clientName": { $regex: q, $options: "i" } },
      ];
    }

    const projects = await Project.find(filter).sort({ createdAt: -1 });
    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No projects found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Projects fetched",
      data: projects,
    });
  } catch (error) {
    console.error("Fetch projects error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const createProject = async (req, res) => {
  try {
    const {
      clientId,
      projectTitle,
      projectDescription,
      timeline,
      amount,
      status,
      paymentStatus,
      paymentAmount,
    } = req.body;

    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: "A valid client is required",
      });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Selected client not found",
      });
    }

    if (!projectTitle?.trim() || !timeline?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project title and timeline are required",
      });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid project amount is required",
      });
    }

    const cleanStatus = ALLOWED_STATUS.includes(status) ? status : "In process";
    const payment = normalizePayment(paymentStatus, numericAmount, paymentAmount);

    if (payment.paymentStatus === "Partial" && payment.paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than 0 for partial payment",
      });
    }

    const project = await Project.create({
      clientId: client._id,
      clientDetails: {
        organizationName: client.organizationName,
        clientName: client.clientName,
        clientPhone: client.clientPhone,
        clientEmail: client.clientEmail || "",
      },
      projectTitle: projectTitle.trim(),
      projectDescription: (projectDescription || "").trim(),
      timeline: timeline.trim(),
      service: client.clientService,
      amount: numericAmount,
      status: cleanStatus,
      paymentStatus: payment.paymentStatus,
      paymentAmount: payment.paymentAmount,
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    console.error("Create project error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const {
      clientId,
      projectTitle,
      projectDescription,
      timeline,
      amount,
      status,
      paymentStatus,
      paymentAmount,
    } = req.body;

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      const client = await Client.findById(clientId);
      if (!client) {
        return res.status(404).json({ success: false, message: "Selected client not found" });
      }
      project.clientId = client._id;
      project.clientDetails = {
        organizationName: client.organizationName,
        clientName: client.clientName,
        clientPhone: client.clientPhone,
        clientEmail: client.clientEmail || "",
      };
      project.service = client.clientService;
    }

    if (projectTitle !== undefined && projectTitle.trim()) {
      project.projectTitle = projectTitle.trim();
    }
    if (projectDescription !== undefined) {
      project.projectDescription = String(projectDescription || "").trim();
    }
    if (timeline !== undefined && timeline.trim()) {
      project.timeline = timeline.trim();
    }
    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ success: false, message: "Invalid project amount" });
      }
      project.amount = numericAmount;
    }
    if (status && ALLOWED_STATUS.includes(status)) {
      project.status = status;
    }

    const nextPaymentStatus = paymentStatus ?? project.paymentStatus;
    const nextPaymentAmount =
      paymentAmount !== undefined ? paymentAmount : project.paymentAmount;
    const payment = normalizePayment(nextPaymentStatus, project.amount, nextPaymentAmount);

    if (payment.paymentStatus === "Partial" && payment.paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than 0 for partial payment",
      });
    }

    project.paymentStatus = payment.paymentStatus;
    project.paymentAmount = payment.paymentAmount;

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Update project error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const deleted = await Project.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};
