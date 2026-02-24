# RBAC User Management API

This is a **Node.js + MongoDB API** for user management with **Role-Based Access Control (RBAC)**.  
It supports:

- Signup (creates **admin** by default)  
- Login (admin and salesman)  
- Admin creating **salesmen**  
- JWT-based authentication  
- Swagger documentation for easy testing  

---

## 🛠 Tech Stack

- Node.js  
- Express.js  
- MongoDB (Atlas or local)  
- Mongoose  
- JWT Authentication  
- Swagger UI (API documentation)  
- bcryptjs for password hashing  

---

## ⚡ Features / Flow

1. **Signup** → always creates **admin**  
2. **Admin Login** → receives `accessToken` and `refreshToken`  
3. **Admin creates Salesman** → only admin can create salesmen  
4. **Salesman Login** → cannot create users, can only access allowed routes  

---

## 📦 Setup / Installation

1. Clone the repo:

```bash
git clone https://github.com/<username>/<repo>.git
cd <repo>

Install dependencies:

npm install

Create a .env file in the root:


Start the server:

npm run dev   # if using nodemon
# or
node server.js

Server runs on http://localhost:5000
