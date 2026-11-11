import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let memoryServer;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("MONGODB_URI is required in production.");
  }

  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri("freshfarm"));
  console.warn("Using temporary development MongoDB. Data resets when the API stops.");
}

export async function closeDatabase() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
