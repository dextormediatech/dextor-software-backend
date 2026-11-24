import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  name: {type: String, required: true},
  department: {type: String, required: true},
  terms: {type: String, required: true}
}, {timestamps: true});

export default mongoose.models.Service || mongoose.model("Service", serviceSchema);
