import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    clientDetails: {
      organizationName: { type: String, required: true, trim: true },
      clientName: { type: String, required: true, trim: true },
      clientPhone: { type: String, required: true, trim: true },
      clientEmail: { type: String, default: "", trim: true },
    },
    projectTitle: { type: String, required: true, trim: true },
    projectDescription: { type: String, default: "", trim: true },
    timeline: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["On hold", "In process", "Completed"],
      default: "In process",
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid"],
      default: "Unpaid",
    },
    paymentAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Project || mongoose.model("Project", projectSchema);
