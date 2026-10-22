# 🥗 NutriPlan - Smart Diet & Meal Planning App

NutriPlan is a modern, full-stack web application designed to help users generate personalized meal plans, track their weight progress, and manage their nutrition goals. Built with React, Node.js, and AI-driven logic, it offers a seamless experience for anyone looking to eat healthier.

## ✨ Features

- **🤖 AI-Powered Meal Planning**: Generates weekly meal plans based on calorie targets, protein goals, dietary preferences (Vegan, Keto, etc.), and allergies.
- **📊 Progress Tracking**: Log your weight daily and visualize your progress with interactive charts.
- **🛒 Smart Shopping List**: Automatically generates a shopping list based on your weekly meal plan.
- **🔐 User Authentication**: Secure login and registration with JWT-based authentication.
- **👤 Personalized Profile**: Set activity levels, health goals, and dietary constraints.
- **📱 Responsive Design**: Beautiful, mobile-friendly UI with Dark Mode support.
- **🍳 Recipe Database**: Extensive collection of recipes for Breakfast, Lunch, Dinner, and Snacks.

## 🛠️ Tech Stack

### Frontend
- **React** (Vite): Fast, modern UI library.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Lucide React**: Beautiful icons.
- **Rect Router**: Client-side routing.
- **Recharts**: Data visualization for weight tracking.

### Backend
- **Node.js & Express**: Robust REST API.
- **Prisma ORM**: Type-safe database access.
- **SQLite**: Lightweight, serverless database (easy to swap for PostgreSQL/MySQL).
- **JWT**: Secure stateless authentication.

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- **Node.js** (v18+ recommended)
- **npm** or **yarn**

### 1. Clone the Repository
```bash
git clone https://github.com/xxdiii/NutriPlan.git
cd NutriPlan
```

### 2. Backend Setup
The backend handles the API and database.

```bash
cd server

# Install dependencies
npm install

# Set up Environment Variables
# Create a .env file in the server directory with:
# DATABASE_URL="file:./dev.db"
# JWT_SECRET="your_super_secret_key"

# Initialize Database & Run Migrations
npx prisma migrate dev --name init

# Start the Backend Server
npm start
# The server will run on http://localhost:3000
```

### 3. Frontend Setup
Open a new terminal window for the frontend.

```bash
# Return to root directory if you are in server/
cd .. 

# Install dependencies
npm install

# Start the Development Server
npm run dev
```
The app will open at `http://localhost:5173`.

## 📂 Project Structure

```
smart-diet-app/
├── server/                 # Backend Node.js code
│   ├── prisma/             # Database schema & migrations
│   ├── index.js            # API entry point & routes
│   └── ...
├── src/                    # Frontend React code
│   ├── components/         # Reusable UI components
│   ├── contexts/           # Global state (Auth, Theme)
│   ├── data/               # Static recipe data (JSON)
│   ├── pages/              # App pages (Dashboard, MealPlan, etc.)
│   ├── services/           # API integration & generators
│   └── App.jsx             # Main application component
└── ...
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/register` | Register new user |
| `POST` | `/api/login` | Login user & get token |
| `GET` | `/api/profile` | Get user profile |
| `POST` | `/api/meal-plan` | Save a generated meal plan |
| `GET` | `/api/meal-plan` | Get current meal plan |
| `POST` | `/api/weight-logs` | Add new weight entry |
| `GET` | `/api/weight-logs` | Get weight history |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
