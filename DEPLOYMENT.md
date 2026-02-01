# Deployment Guide 🚀

This guide explains how to deploy the **Smart Diet App (NutriPlan)** to production.

Since this is a full-stack application with a database, you cannot deploy everything to Netlify directly. You need to split the deployment:
1.  **Backend & Database** -> Render / Railway / Heroku
2.  **Frontend** -> Netlify / Vercel

---

## Part 1: Backend Deployment (Render.com)
We recommended **Render** because it has a generous free tier for both Node.js services and PostgreSQL databases.

### 1. Prepare for PostgreSQL
The local app uses SQLite (`dev.db`), which does not work on cloud platforms like Render. We created a Postgres schema for you.

1.  In your code, rename `server/prisma/schema.postgres.prisma` to `server/prisma/schema.prisma` (OR just copy the content).
    *   *Note: Do this only when you are ready to deploy or want to test with Postgres locally.*

### 2. Push to GitHub
Make sure your project is pushed to a GitHub repository.

### 3. Creating the Database on Render
1.  Sign up at [render.com](https://render.com).
2.  Click **New +** and select **PostgreSQL**.
3.  Name it `nutriplan-db`, choose a region, and select **Free** plan.
4.  Create it.
5.  **Copy the "Internal Database URL"** (you will need it later).

### 4. Deploying the Node Server
1.  Dashboard -> **New +** -> **Web Service**.
2.  Connect your GitHub repository.
3.  Settings:
    *   **Root Directory**: `server`
    *   **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
    *   **Start Command**: `node index.js`
4.  **Environment Variables** (Advanced):
    *   Add `DATABASE_URL`: Paste the Internal Database URL from step 3.
    *   Add `JWT_SECRET`: Any random long string (e.g., `my_secure_prod_key_99`).
    *   Add `PORT`: `10000` (Render default).
5.  Click **Create Web Service**.
6.  Wait for deployment. Once live, **copy your backend URL** (e.g., `https://nutriplan-api.onrender.com`).

---

## Part 2: Frontend Deployment (Netlify)

### 1. Configure API URL
You need to tell the frontend where the backend lives.
1.  In `src/services/api.js`, you likely have `http://localhost:3000`.
2.  Change this to your **Render Backend URL** (e.g., `https://nutriplan-api.onrender.com/api`).
    *   *Pro Tip: Use `import.meta.env.VITE_API_URL` and set it in Netlify env vars.*

### 2. Deploy to Netlify
1.  Sign up at [netlify.com](https://netlify.com).
2.  **Add new site** -> **Import an existing project**.
3.  Connect GitHub and choose your repo.
4.  **Build Settings**:
    *   **Base directory**: (leave empty or `./`)
    *   **Build command**: `npm run build`
    *   **Publish directory**: `dist`
5.  **Environment variables** (Optional but recommended):
    *   Key: `VITE_API_URL`
    *   Value: `https://nutriplan-api.onrender.com/api`
6.  Click **Deploy**.

---

## Summary
1.  **Frontend** (Netlify) talks to -> **Backend** (Render).
2.  **Backend** talk to -> **PostgreSQL DB** (Render).
3.  **Users** visit your Netlify URL.

🎉 **Done!**
