import mongoose from "mongoose";

let connectionPromise = null;

export async function connectToDb() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.DB_URL) {
    throw new Error("DB_URL is missing in .env");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.DB_URL)
      .then(() => {
        console.log("Database connected successfully");
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}