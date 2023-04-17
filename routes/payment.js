const express = require("express");
const router = express.Router();
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);

router.use(express.json());
router.use(cors());

router.post("/payment", async (req, res) => {
  console.log("/payment");

  // Destructuration du body
  const { amount, title, token } = req.body;

  try {
    // Ne pas oublier de multiplier par 100 pour envoyer la commande en centimes
    let total = parseInt(amount * 100);

    // Mettre en place la la transaction
    const response = await stripe.charges.create({
      amount: total,
      currency: "eur",
      description: title,
      source: token,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
