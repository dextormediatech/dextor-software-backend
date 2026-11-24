import mongoose from "mongoose";
import Client from "../models/clients.model.js";
import { sendClientWelcomeEmail } from "../utils/mailer.js";
import { uploadClientLogo } from "../utils/cloudinary.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const fetchClients = async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Clients not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Clients fetched",
      data: clients,
    });
  } catch (error) {
    console.error("Fetch clients error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Client fetched",
      data: client,
    });
  } catch (error) {
    console.error("Get client by ID error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const onboardNewClient = async (req, res) => {
  try {
    const {
      organizationName,
      organizationType,
      clientName,
      clientPhone,
      clientEmail,
      clientLogo,
      clientService,
      projectAmount,
      isRecurringService,
      recurring_frequency,
      onboardingDate,
      isActive,
    } = req.body;

    if (
      !organizationName?.trim() ||
      !organizationType?.trim() ||
      !clientName?.trim() ||
      !clientPhone?.trim() ||
      !clientService?.trim() ||
      !onboardingDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organizationName, organizationType, clientName, clientPhone, clientService, and onboardingDate are required",
      });
    }

    const trimmedEmail = clientEmail?.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid clientEmail address",
      });
    }

    const isRecurring = Boolean(isRecurringService);

    let uploadedLogoUrl;
    if (clientLogo) {
      uploadedLogoUrl = await uploadClientLogo(clientLogo);
    }

    const newClient = await Client.create({
      organizationName: organizationName.trim(),
      organizationType: organizationType.trim(),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: trimmedEmail || undefined,
      clientLogo: uploadedLogoUrl,
      clientService: clientService.trim(),
      projectAmount:
        projectAmount !== undefined && projectAmount !== null && projectAmount !== ""
          ? Number(projectAmount)
          : undefined,
      isRecurringService: isRecurring,
      recurring_frequency:
        isRecurring && recurring_frequency ? recurring_frequency : undefined,
      onboardingDate,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    let welcomeEmailSent = false;
    if (newClient.clientEmail) {
      try {
        const emailResult = await sendClientWelcomeEmail(newClient);
        welcomeEmailSent = emailResult.sent;
      } catch (mailError) {
        console.error("Failed to send client welcome email:", mailError);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Client onboarded successfully",
      welcomeEmailSent,
      data: newClient,
    });
  } catch (error) {
    console.error("Onboard client error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const {
      organizationName,
      organizationType,
      clientName,
      clientPhone,
      clientEmail,
      clientLogo,
      clientService,
      projectAmount,
      isRecurringService,
      recurring_frequency,
      onboardingDate,
      isActive,
    } = req.body;

    if (organizationName !== undefined && organizationName.trim()) {
      client.organizationName = organizationName.trim();
    }
    if (organizationType !== undefined && organizationType.trim()) {
      client.organizationType = organizationType.trim();
    }
    if (clientName !== undefined && clientName.trim()) {
      client.clientName = clientName.trim();
    }
    if (clientPhone !== undefined && clientPhone.trim()) {
      client.clientPhone = clientPhone.trim();
    }
    if (clientEmail !== undefined) {
      const trimmedEmail = clientEmail ? clientEmail.trim() : "";
      if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid clientEmail address",
        });
      }
      client.clientEmail = trimmedEmail || undefined;
    }
    if (clientLogo !== undefined) {
      if (!clientLogo) {
        client.clientLogo = undefined;
      } else {
        client.clientLogo = await uploadClientLogo(clientLogo);
      }
    }
    if (clientService !== undefined && clientService.trim()) {
      client.clientService = clientService.trim();
    }
    if (projectAmount !== undefined) {
      client.projectAmount =
        projectAmount === null || projectAmount === ""
          ? undefined
          : Number(projectAmount);
    }
    if (isRecurringService !== undefined) {
      client.isRecurringService = Boolean(isRecurringService);
      if (!client.isRecurringService) {
        client.recurring_frequency = undefined;
      }
    }
    if (recurring_frequency !== undefined && client.isRecurringService) {
      client.recurring_frequency = recurring_frequency || undefined;
    }
    if (onboardingDate !== undefined) {
      client.onboardingDate = onboardingDate;
    }
    if (isActive !== undefined) {
      client.isActive = Boolean(isActive);
    }

    await client.save();

    return res.status(200).json({
      success: true,
      message: "Client updated successfully",
      data: client,
    });
  } catch (error) {
    console.error("Update client error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const deletedClient = await Client.findByIdAndDelete(id);

    if (!deletedClient) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Client deleted successfully",
      data: {
        id: deletedClient._id,
      },
    });
  } catch (error) {
    console.error("Delete client error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};
