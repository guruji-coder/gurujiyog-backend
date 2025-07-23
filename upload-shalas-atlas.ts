import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";
import YogaShala from "./src/models/YogaShala";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function uploadShalasToAtlas() {
  try {
    // Get Atlas connection string from user
    const atlasUri = await askQuestion(
      "Enter your MongoDB Atlas connection string: "
    );

    if (!atlasUri) {
      console.error("No connection string provided!");
      rl.close();
      return;
    }

    // Connect to MongoDB Atlas
    await mongoose.connect(atlasUri);
    console.log("Connected to MongoDB Atlas");

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
    console.log(
      `Successfully uploaded ${result.length} shalas to MongoDB Atlas`
    );

    // Log the uploaded shalas
    result.forEach((shala, index) => {
      console.log(
        `${index + 1}. ${shala.name} - ${shala.address.street}, ${shala.address.city}`
      );
    });

    console.log("\n✅ Upload completed! Check your Atlas dashboard.");
  } catch (error) {
    console.error("Error uploading shalas:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("MongoDB Atlas connection closed");
    rl.close();
  }
}

// Run the upload function
uploadShalasToAtlas();
