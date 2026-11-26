
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectToDb } from "./utils/db.js";
import authRoutes from "./routes/auth.routes.js";
import clientRoutes from "./routes/client.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import quotationRoutes from "./routes/quotation.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import receiptRoutes from "./routes/receipt.routes.js";

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

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DEXTOR MEDIATECH API is running",
  });
});

export default app;

