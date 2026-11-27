import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    interestedServices: {
      type: [String],
      enum: ["Software Development", "Social Media Marketing"],
      default: ["Software Development"],
    },
    status: {
      type: String,
      enum: ["On hold", "Client"],
      default: "On hold",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);
