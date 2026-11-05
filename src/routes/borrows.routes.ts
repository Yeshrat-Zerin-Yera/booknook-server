
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// POST /borrows - Protected: Borrow a book
router.post("/", requireAuth, async (req, res) => {
    try {
        const userId = req.authUser?.sub;

        if (typeof userId !== "string") {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const { bookId } = req.body;

        const userName = req.authUser?.name;
        const userEmail = req.authUser?.email;

        if (
            typeof bookId !== "string" ||
            !ObjectId.isValid(bookId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid book ID",
            });
        }

        if (
            typeof userName !== "string" ||
            !userName.trim() ||
            typeof userEmail !== "string" ||
            !userEmail.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "User name and email are required",
            });
        }

        const db = getDB();
        const booksCollection = db.collection("books");
        const borrowsCollection = db.collection("borrows");

        const book = await booksCollection.findOne({
            _id: new ObjectId(bookId),
        });

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found",
            });
        }

        const existingBorrow = await borrowsCollection.findOne({
            userId,
            bookId,
            returnedAt: null,
        });

        if (existingBorrow) {
            return res.status(409).json({
                success: false,
                message: "You have already borrowed this book",
            });
        }

        const borrowDate = new Date();

        const returnDate = new Date(borrowDate);
        returnDate.setDate(returnDate.getDate() + 7);

        const newBorrow = {
            bookId,
            bookTitle: book.title,
            bookImage: book.cover,
            userId,
            userName: userName.trim(),
            userEmail: userEmail.trim().toLowerCase(),
            borrowDate,
            returnDate,
            returnedAt: null,
            createdAt: new Date(),
        };

        const result = await borrowsCollection.insertOne(newBorrow);

        return res.status(201).json({
            success: true,
            message: "Book borrowed successfully",
            data: {
                _id: result.insertedId,
                ...newBorrow,
            },
        });
    } catch (error) {
        console.error("Error borrowing book:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to borrow book",
        });
    }
});

// GET /borrows - Protected: Get logged-in user's borrow records
router.get("/", requireAuth, async (req, res) => {
    try {
        const userId = req.authUser?.sub;

        if (typeof userId !== "string") {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const db = getDB();

        const borrows = await db
            .collection("borrows")
            .find({ userId })
            .sort({ borrowDate: -1 })
            .toArray();

        return res.status(200).json({
            success: true,
            count: borrows.length,
            data: borrows,
        });
    } catch (error) {
        console.error("Error fetching borrow records:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch borrow records",
        });
    }
});

// DELETE /borrows/:id - Protected: Return a borrowed book
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const userId = req.authUser?.sub;
        const id = req.params.id;

        if (typeof userId !== "string") {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        if (typeof id !== "string" || !ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid borrow record ID",
            });
        }

        const db = getDB();

        const result = await db.collection("borrows").deleteOne({
            _id: new ObjectId(id),
            userId,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Borrow record not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Book returned successfully",
        });
    } catch (error) {
        console.error("Error returning book:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to return book",
        });
    }
});


export default router;
