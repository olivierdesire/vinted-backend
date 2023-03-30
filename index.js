require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const cloudinary = require("cloudinary").v2;

// config cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

const offerRoutes = require("./routes/offer");
app.use(offerRoutes);

const userRoutes = require("./routes/user");
app.use(userRoutes);

app.all("*", (req, res) => {
  try {
    return res.status(404).json({ message: "Not found" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server started");
});
