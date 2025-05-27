#!/usr/bin/env node

/**
 * Test Analytics Query Fix
 */

const db = require("../config/database");
const { getSiteAnalyticsDB } = require("../models/admin.model");

async function testAnalytics() {
  console.log("🧪 Testing Admin Analytics Fix...\n");

  try {
    console.log("📊 Running getSiteAnalyticsDB with 30 days...");
    const result = await getSiteAnalyticsDB(30);

    console.log("✅ Analytics query completed successfully!");
    console.log("\n📈 Results Summary:");
    console.log(`- Total Visits: ${result.totalVisits?.total_visits || 0}`);
    console.log(
      `- Unique Visitors: ${result.uniqueVisitors?.unique_visitors || 0}`
    );
    console.log(
      `- Most Attempted Lessons: ${
        result.mostAttemptedLessons?.length || 0
      } results`
    );
    console.log(`- Daily Visits: ${result.dailyVisits?.length || 0} days`);
    console.log(`- Top Pages: ${result.topPages?.length || 0} pages`);

    if (result.mostAttemptedLessons && result.mostAttemptedLessons.length > 0) {
      console.log("\n🏆 Most Attempted Lessons:");
      result.mostAttemptedLessons.forEach((lesson, i) => {
        console.log(
          `  ${i + 1}. ${lesson.lesson_title}: ${lesson.attempts} attempts`
        );
      });
    } else {
      console.log(
        "\n📝 No lesson attempt data found (this is normal for a new system)"
      );
    }

    if (result.userStats) {
      console.log(`\n👥 User Stats:`);
      console.log(`  - Total Users: ${result.userStats.total_users || 0}`);
      console.log(`  - Active Users: ${result.userStats.active_users || 0}`);
      console.log(`  - New Users: ${result.userStats.new_users || 0}`);
    }

    console.log("\n✅ All analytics queries working correctly!");
  } catch (error) {
    console.error("❌ Analytics test failed:", error.message);
    if (
      error.message.includes("column") &&
      error.message.includes("does not exist")
    ) {
      console.error("💡 This is a database schema issue - column missing");
    }
  } finally {
    process.exit();
  }
}

testAnalytics();
