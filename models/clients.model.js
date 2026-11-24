import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  organizationName: {type:String, required: true },
  organizationType: {type: String, required: true},
  clientName: {type: String, required: true},
  clientPhone: {type: String, required: true},
  clientEmail: {type: String},
  clientLogo: {type: String},
  clientService: {type: String, required: true},
  projectAmount: {type: Number},
  isRecurringService: {type: Boolean, default: false},
  recurring_frequency: {type: String, enum: ["Monthly", "Quarterly", "Quaterly", "Half-Yearly", "Yearly"]},
  onboardingDate: {type: Date, required: true},
  isActive: {type: Boolean, default: true}
}, {timestamps: true});

export default mongoose.models.Client || mongoose.model("Client", clientSchema);
