import mongoose from "mongoose";
import Service from "../models/services.models.js";

export const fetchServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });

    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Services fetched",
      data: services,
    });
  } catch (error) {
    console.log("Error fetching services: ", error);
    return res.status(500).json({
      success: false,
      message: `Error fetching services: ${error.message || error}`,
    });
  }
};

export const addServices = async (req, res) => {
  try {
    const { name, department, terms } = req.body;

    if (!name?.trim() || !department?.trim() || !terms?.trim()) {
      return res.status(400).json({
        success: false,
        message: "name, department, and terms are required",
      });
    }

    const newService = await Service.create({
      name: name.trim(),
      department: department.trim(),
      terms: terms.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Service created",
      data: newService,
    });
  } catch (error) {
    console.log("Error creating services: ", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID",
      });
    }

    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const { name, department, terms } = req.body;

    if (name !== undefined && name.trim()) {
      service.name = name.trim();
    }
    if (department !== undefined && department.trim()) {
      service.department = department.trim();
    }
    if (terms !== undefined && terms.trim()) {
      service.terms = terms.trim();
    }

    await service.save();

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: service,
    });
  } catch (error) {
    console.log("Error updating service: ", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID",
      });
    }

    const deletedService = await Service.findByIdAndDelete(id);

    if (!deletedService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      data: {
        id: deletedService._id,
      },
    });
  } catch (error) {
    console.log("Error deleting service: ", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};
