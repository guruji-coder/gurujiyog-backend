import mongoose from "mongoose";
import YogaShala from "./src/models/YogaShala";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/gurujiyog";

async function checkDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check total count
    const totalCount = await YogaShala.countDocuments();
    console.log("Total documents in collection:", totalCount);

    // Check active count
    const activeCount = await YogaShala.countDocuments({ isActive: true });
    console.log("Active documents:", activeCount);

    // Get first few documents
    const firstFew = await YogaShala.find().limit(3);
    console.log(
      "First few documents:",
      firstFew.map((doc) => ({
        name: doc.name,
        isActive: doc.isActive,
        city: doc.address?.city,
      }))
    );

    // Check if collection exists
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db
        .listCollections()
        .toArray();
      console.log(
        "Collections in database:",
        collections.map((c) => c.name)
      );
    }
  } catch (error) {
    console.error("Error checking database:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabase();
