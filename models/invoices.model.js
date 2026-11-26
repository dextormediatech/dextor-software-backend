import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation" },
    quotationNumber: { type: String, default: "", trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    clientDetails: {
      organizationName: { type: String, required: true, trim: true },
      clientName: { type: String, required: true, trim: true },
      clientPhone: { type: String, required: true, trim: true },
      clientEmail: { type: String, default: "", trim: true },
    },
    title: { type: String, required: true, trim: true },
    items: {
      type: [invoiceItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, "At least one invoice item is required"],
    },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    notes: {
      type: String,
      default:
        "1. Kindly make advance payment on or before due date.\n2. Share payment screenshot on successful payment.",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid"],
      default: "Unpaid",
    },
    pdfUrl: { type: String, default: "" },
    cloudinaryPublicId: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
