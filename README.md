# 📚 BookNook – Backend API

This is the backend API for **BookNook**, an online library platform. It handles authentication, book management, borrowing operations, stock management, and database communication.

## ✨ Features

- **Authentication:** Secure user authentication using Better Auth.
- **Google OAuth:** Supports Google account authentication.
- **Book Management:** Create, retrieve, update, and delete book records.
- **MongoDB Integration:** Stores application data using MongoDB.
- **Borrow Books:** Handles book borrowing requests from authenticated users.
- **Return Books:** Processes book returns and updates borrowing records.
- **Stock Management:** Decreases available copies when a book is borrowed and increases copies when returned.
- **Availability Validation:** Prevents borrowing when no copies are available.
- **Borrowing Records:** Maintains user borrowing information and return dates.
- **Protected Routes:** Restricts authorized operations to authenticated users.

## 🛠️ Technologies Used

- Node.js
- Express.js
- TypeScript
- MongoDB
- Better Auth
- Google OAuth
- JSON Web Token (JWT)

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/Yeshrat-Zerin-Yera/booknook-server.git
```

### 2. Navigate to the project directory

```bash
cd booknook-server
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:5000

CLIENT_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Important:** Replace the placeholder values with your own credentials. Never commit `.env` files or expose secret keys in GitHub.

### 5. Start the development server

```bash
npm run dev
```

The backend API will run locally at:

http://localhost:5000

## 📦 Production Build

Build the TypeScript project:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## 🌐 Live Deployment

**Backend API:** https://booknook-server-4vrq.onrender.com/

**Frontend Website:** https://booknook-client-h8et-jet.vercel.app/

## 🔗 Related Repository

**Frontend Repository:** https://github.com/Yeshrat-Zerin-Yera/booknook-client

## 👩‍💻 Developer

**Yeshrat Zerin Yera**

- GitHub: https://github.com/Yeshrat-Zerin-Yera
- LinkedIn: https://www.linkedin.com/in/yeshrat-zerin-yera/

---

Made with ❤️ for book lovers.