import mongoose from "mongoose";

const quotationItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const signaturePersonSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    signatureSvg: { type: String, default: "" },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, required: true, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    clientDetails: {
      organizationName: { type: String, required: true, trim: true },
      clientName: { type: String, required: true, trim: true },
      clientPhone: { type: String, required: true, trim: true },
      clientEmail: { type: String, default: "", trim: true },
    },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    serviceName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    items: {
      type: [quotationItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, "At least one quotation item is required"],
    },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "", trim: true },
    terms: { type: String, default: "", trim: true },
    signatures: {
      authorizedPerson: { type: signaturePersonSchema, default: () => ({}) },
      coordinator: { type: signaturePersonSchema, default: () => ({}) },
      clientApprover: {
        name: { type: String, default: "" },
      },
    },
    pdfUrl: { type: String, default: "" },
    cloudinaryPublicId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Approved", "Rejected"],
      default: "Sent",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Quotation || mongoose.model("Quotation", quotationSchema);
