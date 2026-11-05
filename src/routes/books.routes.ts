
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// GET /books - Public: Get all books
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

// GET /books/my-books - Protected: Get logged-in user's books
// IMPORTANT: Keep this route before GET /:id
router.get("/my-books", requireAuth, async (req, res) => {
    try {
        const userId = req.authUser?.sub;

        if (typeof userId !== "string") {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const db = getDB();

        const books = await db
            .collection("books")
            .find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            count: books.length,
            data: books,
        });
    } catch (error) {
        console.error("Error fetching user's books:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch your books",
        });
    }
});

// POST /books - Protected: Add a new book
router.post("/", requireAuth, async (req, res) => {
    try {
        const userId = req.authUser?.sub;

        if (typeof userId !== "string") {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const {
            title,
            author,
            category,
            cover,
            description,
        } = req.body;

        if (
            !title?.trim() ||
            !author?.trim() ||
            !category?.trim() ||
            !cover?.trim() ||
            !description?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "All book fields are required",
            });
        }

        const newBook = {
            title: title.trim(),
            author: author.trim(),
            category: category.trim(),
            cover: cover.trim(),
            description: description.trim(),
            createdBy: userId,
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

// PATCH /books/:id - Protected: Update only your own book
router.patch("/:id", requireAuth, async (req, res) => {
    try {
        const id = req.params.id;

        if (typeof id !== "string" || !ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID",
            });
        }

        const userId = req.authUser?.sub;

        if (typeof userId !== "string") {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const {
            title,
            author,
            category,
            cover,
            description,
        } = req.body;

        const updates: Record<string, string> = {};

        if (title !== undefined) updates.title = title.trim();
        if (author !== undefined) updates.author = author.trim();
        if (category !== undefined) updates.category = category.trim();
        if (cover !== undefined) updates.cover = cover.trim();
        if (description !== undefined) updates.description = description.trim();

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields provided to update",
            });
        }

        const db = getDB();

        const result = await db.collection("books").updateOne(
            {
                _id: new ObjectId(id),
                createdBy: userId,
            },
            {
                $set: {
                    ...updates,
                    updatedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Book not found or you do not have permission to update it",
            });
        }

        res.status(200).json({
            success: true,
            message: "Book updated successfully",
        });
    } catch (error) {
        console.error("Error updating book:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update book",
        });
    }
});

// DELETE /books/:id - Protected: Delete only your own book
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const id = req.params.id;

        if (typeof id !== "string" || !ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID",
            });
        }

        const userId = req.authUser?.sub;

        if (typeof userId !== "string") {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const db = getDB();

        const result = await db.collection("books").deleteOne({
            _id: new ObjectId(id),
            createdBy: userId,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Book not found or you do not have permission to delete it",
            });
        }

        res.status(200).json({
            success: true,
            message: "Book deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting book:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete book",
        });
    }
});

// GET /books/:id - Public: Get one book
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        if (typeof id !== "string" || !ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID",
            });
        }

        const db = getDB();

        const book = await db.collection("books").findOne({
            _id: new ObjectId(id),
        });

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found",
            });
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
