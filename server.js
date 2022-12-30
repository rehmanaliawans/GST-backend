const dotenv = require("dotenv");
const connectDB = require("./config/DB");

dotenv.config({
  path: "./config.env"
});

const app = require("./app");

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server running on port: ${PORT}`));
