const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Node.js fonctionne sur o2switch 🎉");
});

module.exports = app;
