const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const con = await mongoose.connect(process.env.MONGO_URI).then((con) => {
      console.log(`DataBase Connected`);
    });
  } catch (error) {
    process.exit;
  }
};

module.exports = connectDB;
