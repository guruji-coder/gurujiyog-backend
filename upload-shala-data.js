const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Import the YogaShala model
const YogaShala = require("./src/models/YogaShala");

// MongoDB connection string - replace with your actual connection string
const MONGODB_URI =
  "mongodb+srv://ishaan:alPVtg1nwyfJzCOC@gurujiyog.0rgtg.mongodb.net/";

async function uploadShalaData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Read the JSON file
    const dataPath = path.join(__dirname, "fake-shala-data.json");
    const shalaData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

    // Clear existing data (optional)
    await YogaShala.deleteMany({});
    console.log("Cleared existing shala data");

    // Insert the data
    const result = await YogaShala.insertMany(shalaData);
    console.log(`Successfully uploaded ${result.length} shala records`);

    // Log the inserted documents
    result.forEach((shala, index) => {
      console.log(`${index + 1}. ${shala.name} - ${shala.address.city}`);
    });
  } catch (error) {
    console.error("Error uploading data:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

// Run the upload function
uploadShalaData();
