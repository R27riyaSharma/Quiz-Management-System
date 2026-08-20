# Quizly - Quiz Management & Online Assessment Platform

Quizly is a responsive full-stack web-based online assessment platform designed for administrators to create and manage quizzes, and for students to attempt quizzes, review results, and track their scores.

Built using **Vite + React (Tailwind CSS v4 + Recharts)** on the frontend and **Node.js (Express + Prisma + SQLite)** on the backend, it enforces zero-trust security constraints strictly on the server-side.

---

## 🛠️ Technology Stack

- **Frontend**:
  - [Vite](https://vitejs.dev/) & [React.js](https://react.dev/)
  - [Tailwind CSS v4](https://tailwindcss.com/) for design aesthetics (glassmorphic styling, custom glowing cards, typography)
  - [Recharts](https://recharts.org/) for student and admin dashboard analytics graphs
  - [React Router DOM](https://reactrouter.com/) for role-protected client routing
  - [Axios](https://axios-http.com/) for HTTP API operations
  - [Lucide React](https://lucide.dev/) for platform icons
- **Backend**:
  - [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/) (ES Modules)
  - [Prisma ORM](https://www.prisma.io/) with [SQLite](https://www.sqlite.org/) (zero-config, self-contained database file)
  - [JSON Web Tokens (JWT)](https://jwt.io/) for session authorization
  - [BcryptJS](https://www.npmjs.com/package/bcryptjs) for secure password hashing

---

## 🔑 Demo Access Credentials

The database comes pre-seeded with two accounts for testing:

| Role | Email Address | Password |
| :--- | :--- | :--- |
| **System Administrator** | `admin@quiz.com` | `adminpassword123` |
| **Student / Candidate** | `student@quiz.com` | `studentpassword123` |

---

## 🚀 Getting Started & Local Setup

### Prerequisites
Make sure you have Node.js (version 18 or above) installed on your system.

### 1. Install Dependencies
Run the installation script from the **root workspace directory** to automatically configure packages for the root, backend, and frontend folders:
```bash
npm run install:all
```

### 2. Database Synchronization & Seeding
From the root directory, configure the database:
```bash
# Push schema and create SQLite file
npm run db:push --prefix backend

# Seed the default admin, student, categories, and quizzes
npm run db:seed --prefix backend
```

### 3. Launch Development Servers
Run the concurrent dev command from the root directory to launch the frontend Vite server and backend nodemon listener at once:
```bash
npm run dev
```
- **React Frontend**: `http://localhost:5173/`
- **Express API Backend**: `http://localhost:5000/`

---

## 🧪 Running Security & API Integration Tests
We have built a test verification harness to validate authentication scopes, zero-trust calculation constraints, and eligibility bounds. Run the tests while the server is active:
```bash
npm run dev
# (In a separate terminal window)
npm run start --prefix backend -- tests/verify.js
# or directly:
node backend/tests/verify.js
```

---

## 📁 Repository Structure
```
├── backend/
│   ├── prisma/
│   │   ├── dev.db             # SQLite local database file
│   │   └── schema.prisma      # Database relationships & schema
│   ├── src/
│   │   ├── controllers/       # Route request aggregates (analytics, attempts, quizzes)
│   │   ├── middleware/        # Role middlewares (admin/student checks)
│   │   ├── routes/            # REST API route entry-points
│   │   ├── utils/
│   │   │   └── seed.js        # DB data seeder
│   │   ├── db.js              # Prisma Client instance
│   │   └── index.js           # Server initializer
│   ├── tests/
│   │   └── verify.js          # API Integration test scripts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Layouts, ProtectedRoute shell, Sidebar, Navbar
│   │   ├── context/           # AuthContext (login, register, logout, profile cache)
│   │   ├── pages/             # Student Dashboard, Quiz Attempt interface, Admin Panels
│   │   ├── utils/
│   │   │   └── api.js         # Axios interceptor configurations
│   │   ├── App.jsx            # Router map
│   │   ├── index.css          # Tailwind CSS v4 variables & custom styling
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── package.json               # Root launcher config
└── README.md                  # Setup documentation
```

---

## 🛡️ Key Security Implementations
1. **Zero-Trust Frontend Scoring**: Score logic, pass/fail grading, elapsed seconds, and maximum allowed attempt limits are calculated, verified, and enforced strictly by the backend.
2. **Choice Protection**: Students are sent questions with choices, but correct answer properties (`isCorrect`) are programmatically omitted during active quiz attempts.
3. **Password Security**: Credentials are encrypted using bcrypt hashing prior to database persistence.
