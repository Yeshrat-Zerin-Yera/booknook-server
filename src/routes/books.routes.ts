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

// POST /books - Add a new book
router.post("/", async (req, res) => {
  try {
    const {
      title,
      author,
      category,
      cover,
      description,
    } = req.body;

    // Validate required fields
    if (
      !title?.trim() ||
      !author?.trim() ||
      !category?.trim() ||
      !cover?.trim() ||
      !description?.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "All book fields are required",
      });
      return;
    }

    const newBook = {
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      cover: cover.trim(),
      description: description.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = getDB();

    const result = await db
      .collection("books")
      .insertOne(newBook);

    res.status(201).json({
      success: true,
      message: "Book added successfully",
      data: {
        _id: result.insertedId,
        ...newBook,
      },
    });
  } catch (error) {
    console.error("Error adding book:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add book",
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