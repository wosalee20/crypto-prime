// Vercel serverless entry point
module.exports = (req, res) => {
  require("../src/server")(req, res);
};
