# TeamFlow: Enterprise Task Manager

TeamFlow is a full-stack, production-ready MERN web application engineered for collaborative teams. It features strict Role-Based Access Control (RBAC), real-time WebSocket notifications, dynamic multi-user assignments, and a highly responsive Kanban-style dashboard.

---

## 🌟 Key Features

- **Ironclad Security (RBAC):** Backend APIs are heavily guarded. Admins have full CRUD permissions, while Members are locked into a seamless, read-only experience for viewing assigned data.
- **Real-Time WebSockets:** Powered by `Socket.io`. Whenever an Admin creates a task, every assigned team member instantly receives a live browser notification without refreshing the page.
- **Collaborative Assignments:** A dynamic, scrollable multi-select UI allows Admins to simultaneously assign infinite members to Projects and Tasks. Dashboards render smart overlapping avatar stacks to visually indicate collaboration size.
- **Dynamic Kanban Dashboard:** Tasks are automatically sorted into "To Do", "In Progress", and "Done" columns.
- **Admin Quick Actions:** Admins can hover over task cards to instantly "✓ Mark as Done" with a single click, complete with animated Toast success notifications.

---

## 🏛 Architecture Overview

TeamFlow is designed as a secure, role-based ecosystem:

1. **The Database Layer:** MongoDB Atlas stores our `User`, `Project`, `Task`, and `Notification` schemas. Tasks and Projects use **Mongoose Array References** (`[{ type: ObjectId }]`) to allow an infinite number of team members to be assigned to a single project or task.
2. **The API Layer:** The Express backend acts as a strict firewall. Using JSON Web Tokens (JWT) stored in LocalStorage, the `authorize("Admin")` middleware ensures that only authenticated Admins can create projects, assign tasks, or change statuses. Members are blocked with `403 Forbidden` errors if they attempt to bypass the UI.
3. **The Real-Time Engine:** When an Admin assigns a task to multiple users, the Express controller loops through the assignee array, saves isolated `Notification` documents, and immediately fires `socket.io` events to those specific users' connected browser instances.
4. **The Client Layer:** The React UI intelligently reads the user's role from the `AuthContext`. If a standard Member logs in, React completely hides the "+ New Task" buttons and disables dropdowns, creating a seamless "View-Only" dashboard perfectly tailored to their assignments.

---

## 🛠 Tech Stack

**Frontend:**
- React 19 + Vite
- Tailwind CSS v4 (Vanilla, utility-first)
- React Router DOM
- Axios & Lucide React (Icons)
- Socket.io-Client

**Backend:**
- Node.js + Express 5
- MongoDB + Mongoose 9
- JSON Web Tokens (JWT) & HTTP-Only Cookies
- Socket.io (Real-time engine)

---

## 🚀 Deployment Guide (Render & Vercel)

This application is decoupled into a `/client` and `/server` architecture, making it extremely easy to deploy as two separate microservices.

### 1. Backend Deployment (Render.com)
Since Render offers a fantastic free tier for Node.js web services, it is the perfect alternative to Railway.
1. Push this repository to GitHub.
2. Log into [Render.com](https://render.com/) and click **New > Web Service**.
3. Connect your GitHub and select this repository.
4. Configure the settings:
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Go to the **Environment Variables** section and add:
   - `MONGO_URI` = `mongodb+srv://<username>:<password>@cluster...` *(Your MongoDB Atlas URI)*
   - `JWT_SECRET` = `any_secure_random_string`
   - `CORS_ORIGIN` = *(Leave blank for now, you will update this after deploying the frontend!)*
6. Click **Create Web Service**. Copy your live `onrender.com` backend URL!

### 2. Frontend Deployment (Vercel)
1. Log into [Vercel.com](https://vercel.com/) and click **Add New Project**.
2. Import this repository.
3. In the project configuration, edit the **Root Directory** to be `client`.
4. The Build Command should auto-detect as `npm run build`. The Install Command is `npm install`.
5. Add the following Environment Variable:
   - `VITE_API_URL` = `https://your-render-backend-url.onrender.com/api`
6. Click Deploy!
7. **Crucial Final Step:** Copy your live Vercel URL. Go back to your Render Dashboard, click your Web Service, go to the **Environment** tab, and update the `CORS_ORIGIN` variable to exactly match your Vercel URL.

---

## 💻 Local Development Setup

### 1. Backend Setup
```bash
cd server
npm install
```
Create a `.env` file in the `/server` directory:
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/team-task-manager
JWT_SECRET=supersecretjwtkey12345
CORS_ORIGIN=http://localhost:5173
```
Start the backend server:
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
```
Start the frontend server:
```bash
npm run dev
```

---

## 🔌 API Documentation

All routes (except Auth) require a valid JWT cookie. 

### Auth (`/api/auth`)
- `POST /register` - Register a new user
- `POST /login` - Login user
- `GET /me` - Get current user profile (Protected)
- `POST /logout` - Clear cookies

### Projects (`/api/projects`)
- `GET /` - Get all projects (Protected)
- `POST /` - Create a project (**Admin Only**)
- `GET /:id` - Get project by ID (Protected)
- `PUT /:id` - Update project (**Admin Only**)
- `DELETE /:id` - Delete project (**Admin Only**)

### Tasks (`/api/tasks`)
- `GET /` - Get all tasks (Protected)
- `GET /my-tasks` - Get tasks assigned to current user array (Protected)
- `GET /project/:projectId` - Get tasks by project (Protected)
- `POST /` - Create a new task and fire WebSockets (**Admin Only**)
- `PUT /:id` - Update a task (**Admin Only**)
- `DELETE /:id` - Delete a task (**Admin Only**)
- `PUT /:id/status` - Quick-action status update (**Admin Only**)

### Users (`/api/users`)
- `GET /` - Get all users (Protected)
