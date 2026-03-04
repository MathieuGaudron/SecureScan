const express = require("express");
const router = express.Router();
const multer = require("multer");
const authMiddleware = require("../middleware/auth.middleware");
const scanController = require("../controllers/scan.controller");

// Multer : stockage memoire, max 50 Mo, fichiers .zip uniquement
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.toLowerCase().endsWith(".zip")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers ZIP sont acceptes"), false);
    }
  },
});

router.post("/", authMiddleware, scanController.scanRepo);
router.post("/zip", authMiddleware, upload.single("zipFile"), scanController.scanZip);

module.exports = router;
