import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    invoiceNumber: { type: String, default: "", trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    clientDetails: {
      organizationName: { type: String, required: true, trim: true },
      clientName: { type: String, required: true, trim: true },
      clientPhone: { type: String, required: true, trim: true },
      clientEmail: { type: String, default: "", trim: true },
    },
    paymentDate: { type: Date, default: Date.now },
    paymentAmount: { type: Number, required: true, min: 0 },
    invoiceTotal: { type: Number, default: 0, min: 0 },
    previousPaid: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0, min: 0 },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI/Net Banking", "Cheque", "Part-Pay"],
      required: true,
    },
    transactionId: { type: String, default: "", trim: true },
    chequeNo: { type: String, default: "", trim: true },
    partPayDetails: {
      cashAmount: { type: Number, default: 0, min: 0 },
      secondaryMode: {
        type: String,
        enum: ["UPI/Net Banking", "Cheque", ""],
        default: "",
      },
      secondaryAmount: { type: Number, default: 0, min: 0 },
      referenceNo: { type: String, default: "", trim: true },
    },
    notes: { type: String, default: "", trim: true },
    pdfUrl: { type: String, default: "" },
    cloudinaryPublicId: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Receipt || mongoose.model("Receipt", receiptSchema);
