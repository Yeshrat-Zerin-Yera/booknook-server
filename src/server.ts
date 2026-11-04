
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import booksRouter from "./routes/books.routes.js";
import { toNodeHandler } from "better-auth/node";
import { createAuth } from "./lib/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

async function startServer() {
  try {
    // 1. Connect to MongoDB first
    await connectDB();

    // 2. Initialize Better Auth after MongoDB connects
    const auth = createAuth();

    // 3. Register Better Auth before express.json()
    app.all("/api/auth/{*any}", toNodeHandler(auth));

    // 4. Register JSON middleware
    app.use(express.json());

    // 5. Register Books API
    app.use("/books", booksRouter);

    // 6. Health check routes
    app.get("/", (_req, res) => {
      res.send("BookNook API is running!");
    });

    app.get("/health", (_req, res) => {
      res.json({
        success: true,
        message: "BookNook server is healthy",
      });
    });

    // 7. Start server
    app.listen(PORT, () => {
      console.log(`BookNook server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
