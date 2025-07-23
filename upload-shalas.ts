import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import YogaShala from "./src/models/YogaShala";

// MongoDB connection string - replace with your actual connection string
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/gurujiyog";

async function uploadShalas() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Read the JSON file
    const shalasData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "delhi-shalas.json"), "utf8")
    );
    console.log(`Found ${shalasData.length} shalas to upload`);

    // Clear existing shalas (optional - remove this if you want to keep existing data)
    await YogaShala.deleteMany({});
    console.log("Cleared existing shalas");

    // Insert the shalas
    const result = await YogaShala.insertMany(shalasData);
    console.log(`Successfully uploaded ${result.length} shalas to MongoDB`);

    // Log the uploaded shalas
    result.forEach((shala, index) => {
      console.log(
        `${index + 1}. ${shala.name} - ${shala.address.street}, ${shala.address.city}`
      );
    });
  } catch (error) {
    console.error("Error uploading shalas:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

// Run the upload function
uploadShalas();
