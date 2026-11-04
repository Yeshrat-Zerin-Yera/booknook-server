import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from .env");
}

const client = new MongoClient(MONGODB_URI);

// Create the database handle before connecting.
const database: Db = client.db("booknook");

export async function connectDB(): Promise<Db> {
  try {
    await client.connect();

    console.log("MongoDB connected successfully!");

    return database;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

export function getDB(): Db {
  return database;
}