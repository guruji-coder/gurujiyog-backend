import User from "../models/User";

export async function fixPreferredLocationData() {
  try {
    console.log("🔧 Fixing preferredLocation data...");

    // Find users with invalid preferredLocation
    const usersWithInvalidLocation = await User.find({
      "preferredLocation.type": "Point",
      $or: [
        { "preferredLocation.coordinates": { $exists: false } },
        { "preferredLocation.coordinates": { $size: 0 } },
        { "preferredLocation.coordinates": null },
      ],
    });

    console.log(
      `Found ${usersWithInvalidLocation.length} users with invalid preferredLocation`
    );

    // Fix each user
    for (const user of usersWithInvalidLocation) {
      console.log(`Fixing user: ${user.email}`);

      // Remove the invalid preferredLocation field
      await User.updateOne(
        { _id: user._id },
        { $unset: { preferredLocation: 1 } }
      );
    }

    // Also remove any users with empty preferredLocation objects
    const usersWithEmptyLocation = await User.find({
      preferredLocation: { $exists: true },
      $or: [
        { preferredLocation: {} },
        { preferredLocation: { type: "Point" } },
      ],
    });

    console.log(
      `Found ${usersWithEmptyLocation.length} users with empty preferredLocation`
    );

    for (const user of usersWithEmptyLocation) {
      console.log(`Fixing user: ${user.email}`);

      await User.updateOne(
        { _id: user._id },
        { $unset: { preferredLocation: 1 } }
      );
    }

    console.log("✅ Fixed all users with invalid preferredLocation data");

    return {
      success: true,
      message: "Fixed all users with invalid preferredLocation data",
      fixedCount:
        usersWithInvalidLocation.length + usersWithEmptyLocation.length,
    };
  } catch (error) {
    console.error("❌ Error fixing preferredLocation data:", error);
    return {
      success: false,
      message: "Failed to fix preferredLocation data",
      error: error,
    };
  }
}
