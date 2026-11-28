import mongoose from "mongoose";
import Bill from "../models/bills.model.js";
import Project from "../models/projects.model.js";

const computeNextBillNumber = async () => {
  const regex = /^BILL-(\d+)$/i;
  const existing = await Bill.find({ billNumber: regex }).select("billNumber");

  let maxNum = 0;
  for (const doc of existing) {
    const match = doc.billNumber?.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }

  const next = maxNum + 1;
  return `BILL-${String(next).padStart(3, "0")}`;
};

export const getNextBillNumber = async (req, res) => {
  try {
    const billNumber = await computeNextBillNumber();
    return res.status(200).json({
      success: true,
      data: { billNumber },
    });
  } catch (error) {
    console.error("Next bill number error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const fetchBills = async (req, res) => {
  try {
    const { search, projectId } = req.query;
    const filter = {};

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      filter.projectId = projectId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { billNumber: { $regex: q, $options: "i" } },
        { billSubject: { $regex: q, $options: "i" } },
        { vendorName: { $regex: q, $options: "i" } },
        { "projectDetails.projectTitle": { $regex: q, $options: "i" } },
        { "projectDetails.clientOrganization": { $regex: q, $options: "i" } },
      ];
    }

    const bills = await Bill.find(filter).sort({ createdAt: -1 });
    if (bills.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bills found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bills fetched",
      data: bills,
    });
  } catch (error) {
    console.error("Fetch bills error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const createBill = async (req, res) => {
  try {
    const {
      billNumber,
      billAmount,
      billSubject,
      vendorName,
      projectId,
      inhousePrice,
      sellingPrice,
    } = req.body;

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "A valid project is required",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Selected project not found",
      });
    }

    if (!billSubject?.trim() || !vendorName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Bill subject and vendor name are required",
      });
    }

    const numBillAmount = Number(billAmount);
    const numInhouse = Number(inhousePrice);
    const numSelling = Number(sellingPrice);

    if (
      !Number.isFinite(numBillAmount) ||
      numBillAmount < 0 ||
      !Number.isFinite(numInhouse) ||
      numInhouse < 0 ||
      !Number.isFinite(numSelling) ||
      numSelling < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Bill amount, inhouse price, and selling price must be valid numbers",
      });
    }

    let finalBillNumber = billNumber?.trim();
    if (!finalBillNumber) {
      finalBillNumber = await computeNextBillNumber();
    } else {
      const exists = await Bill.findOne({ billNumber: finalBillNumber });
      if (exists) {
        finalBillNumber = await computeNextBillNumber();
      }
    }

    const bill = await Bill.create({
      billNumber: finalBillNumber,
      billAmount: numBillAmount,
      billSubject: billSubject.trim(),
      vendorName: vendorName.trim(),
      projectId: project._id,
      projectDetails: {
        projectTitle: project.projectTitle,
        clientOrganization: project.clientDetails?.organizationName || "",
        service: project.service || "",
      },
      inhousePrice: numInhouse,
      sellingPrice: numSelling,
    });

    return res.status(201).json({
      success: true,
      message: "Bill created successfully",
      data: bill,
    });
  } catch (error) {
    console.error("Create bill error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid bill ID" });
    }

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    const {
      billAmount,
      billSubject,
      vendorName,
      projectId,
      inhousePrice,
      sellingPrice,
    } = req.body;

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: "Selected project not found" });
      }
      bill.projectId = project._id;
      bill.projectDetails = {
        projectTitle: project.projectTitle,
        clientOrganization: project.clientDetails?.organizationName || "",
        service: project.service || "",
      };
    }

    if (billSubject !== undefined && billSubject.trim()) {
      bill.billSubject = billSubject.trim();
    }
    if (vendorName !== undefined && vendorName.trim()) {
      bill.vendorName = vendorName.trim();
    }
    if (billAmount !== undefined) {
      const n = Number(billAmount);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ success: false, message: "Invalid bill amount" });
      }
      bill.billAmount = n;
    }
    if (inhousePrice !== undefined) {
      const n = Number(inhousePrice);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ success: false, message: "Invalid inhouse price" });
      }
      bill.inhousePrice = n;
    }
    if (sellingPrice !== undefined) {
      const n = Number(sellingPrice);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ success: false, message: "Invalid selling price" });
      }
      bill.sellingPrice = n;
    }

    await bill.save();

    return res.status(200).json({
      success: true,
      message: "Bill updated successfully",
      data: bill,
    });
  } catch (error) {
    console.error("Update bill error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};

export const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid bill ID" });
    }

    const deleted = await Bill.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Bill deleted successfully",
    });
  } catch (error) {
    console.error("Delete bill error:", error);
    return res.status(500).json({
      success: false,
      message: `Backend server error: ${error.message || error}`,
    });
  }
};
