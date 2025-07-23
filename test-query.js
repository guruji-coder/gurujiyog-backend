const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/gurujiyog");

// Define schema (simplified)
const YogaShalaSchema = new mongoose.Schema(
  {},
  { collection: "yogashalas", strict: false }
);
const YogaShala = mongoose.model("TestYogaShala", YogaShalaSchema);

async function test() {
  try {
    const shala = await YogaShala.findOne({
      name: "Connaught Place Yoga Center",
    }).lean();
    console.log("Keys found:", Object.keys(shala));
    console.log("Has _id:", !!shala._id);
    console.log("Has images:", !!shala.images);
    console.log("Has location:", !!shala.location);
    console.log("Has phone:", !!shala.phone);
    console.log("Has email:", !!shala.email);

    // Try the same query as the controller
    const shalas = await YogaShala.find({ isActive: true }).limit(1).lean();
    console.log("\nController-style query keys:", Object.keys(shalas[0]));

    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
