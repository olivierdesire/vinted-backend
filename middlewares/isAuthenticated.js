// Import du modèle User
const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    console.log("On passe dans isAutenticated");
    console.log(req.headers.authorization);
    //
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace("Bearer ", "");
      console.log(token);

      const userFound = await User.findOne({ token: token }).select("account");
      // console.log(userFound);
      if (userFound) {
        req.user = userFound;
        next();
      } else {
        return res.status(401).json("Unauthorized");
      }
    } else {
      res.status(401).json("Token is required");
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = isAuthenticated;
