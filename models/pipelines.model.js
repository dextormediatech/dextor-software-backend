import mongoose from "mongoose";

const pipelineSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    occasion: {
      type: String,
      required: true,
      trim: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    clientOrganization: {
      type: String,
      trim: true,
      default: "",
    },
    notificationId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Pipeline || mongoose.model("Pipeline", pipelineSchema);
