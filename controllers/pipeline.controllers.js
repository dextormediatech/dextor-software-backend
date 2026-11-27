import mongoose from "mongoose";
import Pipeline from "../models/pipelines.model.js";

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

export const fetchPipelines = async (req, res) => {
  try {
    const { category, limit } = req.query;
    const filter = {};
    const startOfToday = getStartOfToday();

    if (category === "Present") {
      filter.date = { $gte: startOfToday };
    } else if (category === "Past") {
      filter.date = { $lt: startOfToday };
    }

    // Sort Present: earliest first (ascending date). Sort Past / All: recent first (descending date).
    const sort = category === "Present" ? { date: 1, createdAt: -1 } : { date: -1, createdAt: -1 };

    let query = Pipeline.find(filter).sort(sort);
    const parsedLimit = parseInt(limit, 10);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      query = query.limit(parsedLimit);
    }

    const pipelines = await query;
    if (pipelines.length === 0) {
      return res.status(404).json({ success: false, message: "No pipelines found" });
    }

    return res.status(200).json({
      success: true,
      message: "Pipelines fetched",
      data: pipelines,
    });
  } catch (error) {
    console.error("Fetch pipelines error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const createPipeline = async (req, res) => {
  try {
    const { date, occasion, clientId, clientOrganization, notificationId } = req.body;

    if (!date || !occasion?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Date and occasion are required",
      });
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    const pipeline = await Pipeline.create({
      date: parsedDate,
      occasion: occasion.trim(),
      clientId: clientId && mongoose.Types.ObjectId.isValid(clientId) ? clientId : undefined,
      clientOrganization: (clientOrganization || "").trim(),
      notificationId: (notificationId || "").trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Pipeline created successfully",
      data: pipeline,
    });
  } catch (error) {
    console.error("Create pipeline error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const updatePipeline = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid pipeline ID" });
    }

    const pipeline = await Pipeline.findById(id);
    if (!pipeline) {
      return res.status(404).json({ success: false, message: "Pipeline not found" });
    }

    const { date, occasion, clientId, clientOrganization, notificationId } = req.body;

    if (date) {
      const parsedDate = new Date(date);
      if (!Number.isNaN(parsedDate.getTime())) {
        pipeline.date = parsedDate;
      }
    }
    if (occasion !== undefined && occasion.trim()) {
      pipeline.occasion = occasion.trim();
    }
    if (clientId !== undefined) {
      pipeline.clientId =
        clientId && mongoose.Types.ObjectId.isValid(clientId) ? clientId : undefined;
    }
    if (clientOrganization !== undefined) {
      pipeline.clientOrganization = String(clientOrganization || "").trim();
    }
    if (notificationId !== undefined) {
      pipeline.notificationId = String(notificationId || "").trim();
    }

    await pipeline.save();

    return res.status(200).json({
      success: true,
      message: "Pipeline updated successfully",
      data: pipeline,
    });
  } catch (error) {
    console.error("Update pipeline error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const deletePipeline = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid pipeline ID" });
    }

    const deleted = await Pipeline.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Pipeline not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Pipeline deleted successfully",
    });
  } catch (error) {
    console.error("Delete pipeline error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};
