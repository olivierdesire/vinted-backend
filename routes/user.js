const express = require("express");
const router = express.Router();

const SHA256 = require("crypto-js/sha256");
const base64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;

// import des utils
const convertToBase64 = require("../utils/converterB64");

// Import modèles
const User = require("../models/User");

// Routes user
router.post("/user/signup", fileUpload(), async (req, res) => {
  console.log("Route /user/signup");
  try {
    const { username, email, password, newsletter } = req.body;
    console.log(req.body);
    if (username) {
      const userFound = await User.findOne({ email: email });
      if (!userFound) {
        const generatedSalt = uid2(16);
        const generatedHash = SHA256(password + generatedSalt).toString(base64);
        const generatedToken = uid2(16);

        const newUser = new User({
          email: email,
          account: {
            username: username,
          },
          newsletter: newsletter,
          token: generatedToken,
          hash: generatedHash,
          salt: generatedSalt,
        });

        if (req.files?.avatar) {
          const pictureUpload = await cloudinary.uploader.upload(
            convertToBase64(req.files.avatar),
            { folder: `/vinted/users/${newUser._id}`, format: "jpg" }
          );
          newUser.account.avatar = pictureUpload;
        }

        await newUser.save();

        return res.status(201).json({
          _id: newUser._id,
          token: newUser.token,
          account: { username: newUser.account.username },
          email,
        });
      } else {
        return res
          .status(409)
          .json({ error: { message: "Email already has an account" } });
      }
    } else {
      return res.status(400).json({ error: { message: "Username missing" } });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  console.log("Route /user/login");
  try {
    const { email, password } = req.body;
    if (email && password) {
      const userFound = await User.findOne({ email: email });
      if (userFound) {
        const generatedHash = SHA256(password + userFound.salt).toString(
          base64
        );

        if (generatedHash === userFound.hash) {
          return res.status(200).json({
            _id: userFound._id,
            token: userFound.token,
            account: { username: userFound.account.username },
          });
        } else {
          return res
            .status(401)
            .json({ error: { message: "Incorrect email or password" } });
        }
      } else {
        return res
          .status(401)
          .json({ error: { message: "Incorrect email or password" } });
      }
    } else {
      return res
        .status(400)
        .json({ error: { message: "email or password is required" } });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
