const express = require("express");
const router = express.Router();
const cors = require("cors");
const fileUpload = require("express-fileupload");

const cloudinary = require("cloudinary").v2;

// Import du modèle Offer
const Offer = require("../models/Offer");

// Import du middleWare isAuthenticated
const isAuthenticated = require("../middlewares/isAuthenticated");

const convertToBase64 = require("../utils/converterB64");

router.use(express.json());
router.use(cors());

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      console.log("route /offer/publish");
      const { title, description, condition, price, city, brand, size, color } =
        req.body;
      if (req.files.picture && title && price) {
        // console.log(req.user);

        const newOffer = new Offer({
          product_name: title,
          product_description: description,
          product_price: price,
          product_details: [
            { MARQUE: brand },
            { TAILLE: size },
            { ETAT: condition },
            { COULEUR: color },
            { EMPLACEMENT: city },
          ],
          owner: req.user,
        });

        if (
          Array.isArray(req.files.picture) ||
          req.files.picture.mimetype.slice(0, 5) !== "image"
        ) {
          return res.status(400).json("You must send a single image file!");
        } else {
          // Envoi de l'image à Cloudinary
          const pictureUpload = await cloudinary.uploader.upload(
            convertToBase64(req.files.picture),
            { folder: `/vinted/offers/${newOffer._id}`, format: "jpg" }
          );

          newOffer.product_image = pictureUpload;

          await newOffer.save();

          return res.status(201).json(newOffer);
        }
      } else {
        return res
          .status(400)
          .json({ message: "Title, price and picture are required" });
      }
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
);

router.get("/offers", async (req, res) => {
  try {
    console.log("Route /offer");

    let filters = {};

    // pages
    let limit = 10;
    if (req.query.limit) {
      limit = req.query.limit;
    }

    let page = 1;

    if (req.query.page && req.query.page > 0) {
      page = req.query.page;
    }

    // const skip = page * limit - limit;
    const skip = (page - 1) * limit;
    // console.log(skip);

    // filtre titre
    if (req.query.title) {
      filters.product_name = new RegExp(req.query.title, "i");
    }

    if (req.query.priceMin) {
      filters.product_price = { $gte: req.query.priceMin };
    }

    if (req.query.priceMax) {
      if (req.query.priceMin) {
        filters.product_price.$lte = req.query.priceMax;
      } else {
        filters.product_price = {};
        filters.product_price.$lte = req.query.priceMax;
      }
    }

    // filtre sort
    let sort = {};

    if (req.query.sort === "price-desc") {
      sort.product_price = "desc";
    } else if (req.query.sort === "price-asc") {
      sort.product_price = "asc";
    }

    // console.log(filter);
    // console.log(sort);

    const offers = await Offer.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({ path: "owner", select: "account" });
    // .select(
    //   "product_details product_image.secure_url _id product_name production_description product_price owner"
    // );

    // comptage des documents de la recherche des offres sur le filtre
    const count = await Offer.find(filters).countDocuments();

    return res.status(200).json({ count: count, offers: offers });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    console.log("Route /offer:id");
    // console.log(req.params.id);

    const offerFound = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account",
    });

    if (offerFound) {
      return res.status(200).json(offerFound);
    } else {
      return res.status(400).json({ message: "Offer not found" });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.put("/offer/update/:id", isAuthenticated, async (req, res) => {
  try {
    console.log("route /odder/update/:id");

    const offerToModify = await Offer.findById(req.params.id);
    // console.log(offerToModify);

    if (offerToModify) {
      const { title, description, condition, price, city, brand, size, color } =
        req.body;

      // console.log("Offre existante");
      const ownerId = offerToModify.owner.toString();
      if (req.user.id === ownerId) {
        if (title) {
          offerToModify.product_name = title;
        }

        if (description) {
          offerToModify.product_description = description;
        }

        if (price) {
          offerToModify.price = price;
        }

        const details = offerToModify.product_details;
        // console.log(details);

        for (let i = 0; i < details.length; i++) {
          if (condition && details[i].ETAT) {
            details[i].ETAT = condition;
          }
          if (brand && details[i].MARQUE) {
            details[i].MARQUE = brand;
          }
          if (size && details[i].TAILLE) {
            details[i].TAILLE = size;
          }
          if (color && details[i].COLOR) {
            details[i].COLOR = color;
          }
          if (city && details[i].EMPLACEMENT) {
            details[i].EMPLACEMENT = city;
          }
        }
        offerToModify.markModified("product_details");

        await offerToModify.save();

        // console.log("id ok");
        // res.status(200).json(offerToModify);
        return res.status(200).json("Offer modified succesfully !");
      } else {
        console.log(
          `id Token ${req.user.id} not the same id offer's owner ${ownerId}`
        );
        return res.status(400).json({ message: "Offer not exists" });
      }
    } else {
      return res.status(400).json({ message: "Offer not exists" });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    console.log("Route /offer/delete/:id");

    const offerToDelete = await Offer.findById(req.params.id);
    // console.log(offerToModify);

    if (offerToDelete) {
      const ownerId = offerToDelete.owner.toString();
      if (req.user.id === ownerId) {
        // suppression du contenu du dossier dans Cloudinary

        await cloudinary.api.delete_resources_by_prefix(
          `vinted/offers/${req.params.id}`
        );
        // console.log(test);
        // une fois le contenu vidé

        await cloudinary.api.delete_folder(`vinted/offers/${req.params.id}`);

        await offerToDelete.delete();
        return res.status(200).json("Offer deleted succesfully !");
      } else {
        console.log(
          `id Token ${req.user.id} not the same id offer's owner ${ownerId}`
        );
        return res.status(400).json({ message: "Offer not exists" });
      }
    } else {
      return res.status(400).json({ message: "Offer not exists" });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
