const db = require("../config/database");
const fs = require("fs");
const path = require("path");

async function applyPerformanceIndexes() {
  try {
    console.log("🚀 Starting database performance optimization...");

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "performance-indexes.sql");
    const sqlCommands = fs.readFileSync(sqlFilePath, "utf8");

    // Split by semicolons and filter out empty commands
    const commands = sqlCommands
      .split(";")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0 && !cmd.startsWith("--"));

    console.log(`📋 Found ${commands.length} index creation commands`);

    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`⚡ Creating index ${i + 1}/${commands.length}...`);

      try {
        await db.query(command);
        console.log(`✅ Index ${i + 1} created successfully`);
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(`⏭️  Index ${i + 1} already exists, skipping`);
        } else {
          console.error(`❌ Failed to create index ${i + 1}:`, error.message);
        }
      }
    }

    console.log("🎉 Database performance optimization completed!");

    // Test a sample query to verify performance
    console.log("🧪 Testing optimized query performance...");
    const startTime = process.hrtime.bigint();

    await db.query(`
      SELECT c.course_id, c.name, c.difficulty, c.rating,
             COUNT(e.user_id) as enrollment_count
      FROM course c
      LEFT JOIN enrollment e ON c.course_id = e.course_id
      WHERE c.status = 'Published'
      GROUP BY c.course_id, c.name, c.difficulty, c.rating
      LIMIT 10
    `);

    const endTime = process.hrtime.bigint();
    const queryTime = Number(endTime - startTime) / 1000000;

    console.log(`⚡ Sample query executed in ${queryTime.toFixed(2)}ms`);
    console.log("🏁 Performance optimization setup complete!");
  } catch (error) {
    console.error("💥 Error applying performance indexes:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  applyPerformanceIndexes()
    .then(() => {
      console.log(
        "✨ All done! Your database is now optimized for better performance."
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to apply performance optimizations:", error);
      process.exit(1);
    });
}

module.exports = { applyPerformanceIndexes };
