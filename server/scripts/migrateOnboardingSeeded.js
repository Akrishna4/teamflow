require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const User = require("../models/User");

async function runMigration() {
  console.log("[Migration] Starting migrateOnboardingSeeded.js");
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/team-task-manager");
    console.log("[Migration] Connected to MongoDB");

    const totalUsers = await User.countDocuments();
    console.log(`[Migration] Total users inspected: ${totalUsers}`);

    const result = await User.updateMany(
      { onboardingSeeded: { $exists: false } },
      { $set: { onboardingSeeded: false } }
    );

    console.log(`[Migration] Users matched needing repair: ${result.matchedCount}`);
    console.log(`[Migration] Users actually updated: ${result.modifiedCount}`);
    console.log("[Migration] Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("[Migration] Migration failed", error);
    process.exit(1);
  }
}

runMigration();
