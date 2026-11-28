import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    billNumber: { type: String, required: true, unique: true, trim: true },
    billAmount: { type: Number, required: true, min: 0 },
    billSubject: { type: String, required: true, trim: true },
    vendorName: { type: String, required: true, trim: true },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    projectDetails: {
      projectTitle: { type: String, required: true, trim: true },
      clientOrganization: { type: String, default: "", trim: true },
      service: { type: String, default: "", trim: true },
    },
    inhousePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Bill || mongoose.model("Bill", billSchema);
