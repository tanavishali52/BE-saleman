const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

// Load .env from api directory so it works regardless of cwd
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.status(200).json({
    message: "BE Saleman API is running 🚀",
  });
});
// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/admin", require("./routes/admin"));
app.use("/api", require("./routes/category"));
app.use("/api", require("./routes/item"));
// Validate required env before connecting
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("Server error: MONGO_URI is not set. Check your .env file in the api folder.");
  process.exit(1);
}

// Connect MongoDB, then start server so routes don't run before DB is ready
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });