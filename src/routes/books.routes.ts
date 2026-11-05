
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Allowed book categories
const allowedCategories = [
    "Fiction",
    "Science",
    "History",
    "Kids",
    "Others",
] as const;

interface BookFields {
    title: string;
    author: string;
    category: string;
    cover: string;
    description: string;
}

// Validate and clean book input
function validateBookFields(
    body: unknown,
    requireAll: boolean
): { data?: Partial<BookFields>; error?: string } {

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        return { error: "Invalid request body" };
    }

    const input = body as Record<string, unknown>;

    const allowedFields = [
        "title",
        "author",
        "category",
        "cover",
        "description",
    ];

    // Reject unexpected fields
    const unknownFields = Object.keys(input).filter(
        (key) => !allowedFields.includes(key)
    );

    if (unknownFields.length > 0) {
        return { error: "Unexpected book fields provided" };
    }

    const updates: Partial<BookFields> = {};

    const fields = [
        "title",
        "author",
        "category",
        "cover",
        "description",
    ] as const;

    for (const field of fields) {
        const value = input[field];

        // All fields are required when creating a book
        if (value === undefined) {
            if (requireAll) {
                return { error: "All book fields are required" };
            }

            continue;
        }

        // Every field must be a string
        if (typeof value !== "string") {
            return {
                error: `${field} must be a string`,
            };
        }

        const cleanValue = value.trim();

        if (!cleanValue) {
            return {
                error: `${field} cannot be empty`,
            };
        }

        // Title validation
        if (field === "title") {
            if (cleanValue.length < 2 || cleanValue.length > 120) {
                return {
                    error: "Title must be between 2 and 120 characters",
                };
            }
        }

        // Author validation
        if (field === "author") {
            if (cleanValue.length < 2 || cleanValue.length > 80) {
                return {
                    error: "Author must be between 2 and 80 characters",
                };
            }
        }

        // Category validation
        if (field === "category") {
            if (
                !allowedCategories.includes(
                    cleanValue as typeof allowedCategories[number]
                )
            ) {
                return {
                    error: "Invalid book category",
                };
            }
        }

        // Cover URL validation
        if (field === "cover") {
            if (cleanValue.length > 2048) {
                return {
                    error: "Cover URL is too long",
                };
            }

            try {
                const url = new URL(cleanValue);

                if (
                    url.protocol !== "http:" &&
                    url.protocol !== "https:"
                ) {
                    return {
                        error: "Cover must be a valid HTTP or HTTPS URL",
                    };
                }
            } catch {
                return {
                    error: "Cover must be a valid URL",
                };
            }
        }

        // Description validation
        if (field === "description") {
            if (
                cleanValue.length < 10 ||
                cleanValue.length > 1000
            ) {
                return {
                    error: "Description must be between 10 and 1000 characters",
                };
            }
        }

        updates[field] = cleanValue;
    }

    return { data: updates };
}

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
// Keep this route before GET /:id
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
        const userName = req.authUser?.name;
        const userEmail = req.authUser?.email;

        if (
            typeof userId !== "string" ||
            typeof userName !== "string" ||
            typeof userEmail !== "string"
        ) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        // Validate all book fields
        const validation = validateBookFields(req.body, true);

        if (validation.error || !validation.data) {
            return res.status(400).json({
                success: false,
                message: validation.error,
            });
        }

        const newBook = {
            ...validation.data,
            createdBy: userId,
            createdByName: userName,
            createdByEmail: userEmail,
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

        if (
            typeof id !== "string" ||
            !/^[0-9a-fA-F]{24}$/.test(id)
        ) {
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

        // Validate only the fields being updated
        const validation = validateBookFields(req.body, false);

        if (validation.error || !validation.data) {
            return res.status(400).json({
                success: false,
                message: validation.error,
            });
        }

        const updates = validation.data;

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

        if (
            typeof id !== "string" ||
            !/^[0-9a-fA-F]{24}$/.test(id)
        ) {
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

        if (
            typeof id !== "string" ||
            !/^[0-9a-fA-F]{24}$/.test(id)
        ) {
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
