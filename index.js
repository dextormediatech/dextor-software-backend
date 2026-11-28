
import dns from "node:dns";
import net from "node:net";
import express from "express";
import dotenv from "dotenv";

// Prevent Node.js Happy Eyeballs (internalConnectMultiple) ETIMEDOUT on IPv6-broken networks
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}
import cors from "cors";
import { connectToDb } from "./utils/db.js";
import authRoutes from "./routes/auth.routes.js";
import clientRoutes from "./routes/client.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import quotationRoutes from "./routes/quotation.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import receiptRoutes from "./routes/receipt.routes.js";
import pipelineRoutes from "./routes/pipeline.routes.js";
import leadRoutes from "./routes/lead.routes.js";
import reportRoutes from "./routes/report.routes.js";
import projectRoutes from "./routes/project.routes.js";
import billRoutes from "./routes/bill.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(async (req, res, next) => {
  try {
    await connectToDb();
    next();
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/pipelines", pipelineRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/bills", billRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DEXTOR MEDIATECH API is running",
  });
});

export default app;

