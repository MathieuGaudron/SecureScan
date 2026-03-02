const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/scan", (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl manquant" });
  }

  return res.json({
    message: "Scan lancé (pas encore implémenté)",
    repoUrl
  });
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});