
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
            !/^[0-9a-fA-F]{24}$/.test(bookId)
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

        // Prevent the same user from having two active
        // borrow records for the same book.
        await borrowsCollection.createIndex(
            { userId: 1, bookId: 1 },
            {
                unique: true,
                partialFilterExpression: {
                    returnedAt: null,
                },
            }
        );

        const bookObjectId = new ObjectId(bookId);

        const book = await booksCollection.findOne({
            _id: bookObjectId,
        });

        if (!book) {
            return res.status(404).json({
                success: false,
                message: "Book not found",
            });
        }

        // Friendly duplicate-borrow check.
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

        // Atomically decrease copies only when copies > 0.
        const stockUpdate = await booksCollection.updateOne(
            {
                _id: bookObjectId,
                copies: { $gt: 0 },
            },
            {
                $inc: { copies: -1 },
                $set: { updatedAt: new Date() },
            }
        );

        if (stockUpdate.modifiedCount === 0) {
            return res.status(409).json({
                success: false,
                message: "This book is not available right now",
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

        try {
            const result = await borrowsCollection.insertOne(newBorrow);

            return res.status(201).json({
                success: true,
                message: "Book borrowed successfully",
                data: {
                    _id: result.insertedId,
                    ...newBorrow,
                },
            });
        } catch (insertError) {
            // Restore the copy if creating the borrow record fails.
            await booksCollection.updateOne(
                { _id: bookObjectId },
                { $inc: { copies: 1 } }
            );

            if (
                typeof insertError === "object" &&
                insertError !== null &&
                "code" in insertError &&
                insertError.code === 11000
            ) {
                return res.status(409).json({
                    success: false,
                    message: "You have already borrowed this book",
                });
            }

            throw insertError;
        }
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

        if (
            typeof id !== "string" ||
            !/^[0-9a-fA-F]{24}$/.test(id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid borrow record ID",
            });
        }

        const db = getDB();
        const borrowsCollection = db.collection("borrows");
        const booksCollection = db.collection("books");

        const borrowObjectId = new ObjectId(id);

        // Find this user's borrow record.
        const borrow = await borrowsCollection.findOne({
            _id: borrowObjectId,
            userId,
        });

        if (!borrow) {
            return res.status(404).json({
                success: false,
                message: "Borrow record not found",
            });
        }

        // Delete only one matching record.
        const deleteResult = await borrowsCollection.deleteOne({
            _id: borrowObjectId,
            userId,
        });

        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Borrow record not found",
            });
        }

        // Restore one available copy.
        const stockUpdate = await booksCollection.updateOne(
            {
                _id: new ObjectId(borrow.bookId),
            },
            {
                $inc: { copies: 1 },
                $set: { updatedAt: new Date() },
            }
        );

        if (stockUpdate.matchedCount === 0) {
            // Restore the borrow record if its book no longer exists.
            await borrowsCollection.insertOne(borrow);

            return res.status(404).json({
                success: false,
                message: "Book not found. Return could not be completed.",
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
