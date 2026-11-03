import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const router = Router();

// GET /books - Get all books
router.get("/", async (_req, res) => {
  try {
    const db = getDB();

    const books = await db
      .collection("books")
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: books.length,
      data: books,
    });
  } catch (error) {
    console.error("Error fetching books:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch books",
    });
  }
});

// GET /books/:id - Get one book
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
      return;
    }

    const db = getDB();

    const book = await db.collection("books").findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    console.error("Error fetching book:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch book",
    });
  }
});

export default router;