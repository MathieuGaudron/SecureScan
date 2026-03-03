const express = require("express");
const router = express.Router();

const scanController = require("../controllers/scan.controller");

router.post("/", scanController.scanRepo);

module.exports = router;