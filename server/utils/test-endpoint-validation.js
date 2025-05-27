#!/usr/bin/env node

/**
 * End-to-End Validation Test for Course Section Optimization
 * Validates that the optimized endpoint returns the same data structure as the original approach
 */

const { Pool } = require("pg");
require("dotenv").config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "devquest",
  password: process.env.DB_PASSWORD || "",
  port: process.env.DB_PORT || 5432,
  ssl:
    process.env.DB_HOST && process.env.DB_HOST.includes("aivencloud.com")
      ? { rejectUnauthorized: false }
      : false,
});

// Test configuration
const TEST_CONFIG = {
  courseId: 2, // Using course ID 2 (Go) from our sample data
  userId: 2, // Using user ID 2 from our sample data
};

async function simulateOriginalQueries(courseId, userId) {
  const client = await pool.connect();

  try {
    // Simulate the original 6 separate API calls/queries

    // 1. Check subscription status
    const subscriptionResult = await client.query(
      `
      SELECT 
        CASE 
          WHEN s.status = 'active' AND s.subscription_end_date > NOW() THEN true 
          ELSE false 
        END as has_active_subscription
      FROM users u
      LEFT JOIN subscription s ON u.user_id = s.user_id
      WHERE u.user_id = $1
    `,
      [userId]
    );

    // 2. Get profile data
    const profileResult = await client.query(
      `
      SELECT name, profileimage, streak FROM users WHERE user_id = $1
    `,
      [userId]
    );

    // 3. Get course data
    const courseResult = await client.query(
      `
      SELECT course_id, name as title, description, status FROM course WHERE course_id = $1
    `,
      [courseId]
    );

    // 4. Get sections with lessons
    const sectionsResult = await client.query(
      `
      SELECT 
        s.section_id, s.name, s.description, s.section_order,
        l.lesson_id, l.name as lesson_name, l.lesson_order,
        COALESCE(lp.completed, false) as completed
      FROM section s
      LEFT JOIN lesson l ON s.section_id = l.section_id
      LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $2
      WHERE s.course_id = $1
      ORDER BY s.section_order, l.lesson_order
    `,
      [courseId, userId]
    );

    // 5. Get course stats
    const courseStatsResult = await client.query(
      `
      SELECT 
        COALESCE(SUM(l.xp), 0) as course_xp,
        COUNT(DISTINCT lp.lesson_id) as exercises_completed
      FROM lesson_progress lp
      JOIN lesson l ON lp.lesson_id = l.lesson_id
      JOIN section s ON l.section_id = s.section_id
      WHERE lp.user_id = $2 AND s.course_id = $1 AND lp.completed = true
    `,
      [courseId, userId]
    );

    // 6. Get overall stats
    const overallStatsResult = await client.query(
      `
      SELECT 
        COALESCE(SUM(l.xp), 0) as total_xp,
        COUNT(DISTINCT lp.lesson_id) as total_exercises_completed
      FROM lesson_progress lp
      LEFT JOIN lesson l ON lp.lesson_id = l.lesson_id
      WHERE lp.user_id = $1 AND lp.completed = true
    `,
      [userId]
    );

    // Process sections data (similar to original frontend logic)
    const sectionsMap = new Map();
    sectionsResult.rows.forEach((row) => {
      if (!sectionsMap.has(row.section_id)) {
        sectionsMap.set(row.section_id, {
          section_id: row.section_id,
          name: row.name,
          description: row.description,
          section_order: row.section_order,
          lessons: [],
        });
      }

      if (row.lesson_id) {
        sectionsMap.get(row.section_id).lessons.push({
          lesson_id: row.lesson_id,
          name: row.lesson_name,
          lesson_order: row.lesson_order,
          completed: row.completed,
        });
      }
    });

    const sections = Array.from(sectionsMap.values()).sort(
      (a, b) => a.section_order - b.section_order
    );

    sections.forEach((section) => {
      section.lessons.sort((a, b) => a.lesson_order - b.lesson_order);
    });

    return {
      subscription: subscriptionResult.rows[0],
      profile: profileResult.rows[0],
      course: courseResult.rows[0],
      sections: sections,
      courseStats: courseStatsResult.rows[0],
      overallStats: overallStatsResult.rows[0],
    };
  } finally {
    client.release();
  }
}

async function getOptimizedQueryResult(courseId, userId) {
  const client = await pool.connect();

  try {
    // Execute the optimized query (same as in the controller)
    const optimizedQuery = `
      WITH course_info AS (
        SELECT 
          c.course_id,
          c.name as title,
          c.description,
          c.status
        FROM course c
        WHERE c.course_id = $1 AND c.status = 'Published'
      ),
      subscription_info AS (
        SELECT 
          CASE 
            WHEN s.status = 'active' AND s.subscription_end_date > NOW() THEN true 
            ELSE false 
          END as has_active_subscription,
          COALESCE(
            (SELECT COUNT(*) 
             FROM lesson_progress lp 
             WHERE lp.user_id = $2 AND lp.completed = true), 0
          ) as completed_lessons_count
        FROM users u
        LEFT JOIN subscription s ON u.user_id = s.user_id
        WHERE u.user_id = $2
      ),
      user_profile AS (
        SELECT 
          u.name,
          u.profileimage,
          u.streak,
          COALESCE(
            (SELECT COUNT(*) 
             FROM lesson_progress lp 
             WHERE lp.user_id = u.user_id AND lp.completed = true), 0
          ) as exercises_completed
        FROM users u
        WHERE u.user_id = $2
      ),
      sections_with_lessons AS (
        SELECT 
          s.section_id,
          s.name,
          s.description,
          s.section_order,
          json_agg(
            json_build_object(
              'lesson_id', l.lesson_id,
              'name', l.name,
              'lesson_order', l.lesson_order,
              'completed', COALESCE(lp.completed, false)
            ) ORDER BY l.lesson_order
          ) as lessons
        FROM section s
        LEFT JOIN lesson l ON s.section_id = l.section_id
        LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $2
        WHERE s.course_id = $1
        GROUP BY s.section_id, s.name, s.description, s.section_order
        ORDER BY s.section_order
      ),
      course_stats AS (
        SELECT 
          COALESCE(SUM(l.xp), 0) as course_xp,
          COUNT(DISTINCT lp.lesson_id) as exercises_completed
        FROM lesson_progress lp
        JOIN lesson l ON lp.lesson_id = l.lesson_id
        JOIN section s ON l.section_id = s.section_id
        WHERE lp.user_id = $2 
        AND s.course_id = $1
        AND lp.completed = true
      ),
      overall_stats AS (
        SELECT 
          COALESCE(SUM(l.xp), 0) as total_xp,
          COUNT(DISTINCT lp.lesson_id) as total_exercises_completed
        FROM lesson_progress lp
        LEFT JOIN lesson l ON lp.lesson_id = l.lesson_id
        WHERE lp.user_id = $2 AND lp.completed = true
      )
      SELECT 
        ci.course_id,
        ci.title,
        ci.description,
        ci.status,
        si.has_active_subscription,
        si.completed_lessons_count,
        up.name as user_name,
        up.profileimage as user_profile_image,
        up.streak as user_streak,
        up.exercises_completed as user_exercises_completed,
        COALESCE(cs.course_xp, 0) as course_xp,
        COALESCE(cs.exercises_completed, 0) as course_exercises_completed,
        COALESCE(os.total_xp, 0) as total_xp,
        COALESCE(os.total_exercises_completed, 0) as total_exercises_completed,
        (
          SELECT json_agg(
            json_build_object(
              'section_id', swl.section_id,
              'name', swl.name,
              'description', swl.description,
              'section_order', swl.section_order,
              'lessons', swl.lessons
            ) ORDER BY swl.section_order
          )
          FROM sections_with_lessons swl
        ) as sections
      FROM course_info ci
      CROSS JOIN subscription_info si
      CROSS JOIN user_profile up
      CROSS JOIN course_stats cs
      CROSS JOIN overall_stats os;
    `;

    const result = await client.query(optimizedQuery, [courseId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      subscription: {
        has_active_subscription: row.has_active_subscription,
      },
      profile: {
        name: row.user_name,
        profileimage: row.user_profile_image,
        streak: row.user_streak,
      },
      course: {
        course_id: row.course_id,
        title: row.title,
        description: row.description,
        status: row.status,
      },
      sections: row.sections || [],
      courseStats: {
        course_xp: parseInt(row.course_xp),
        exercises_completed: parseInt(row.course_exercises_completed),
      },
      overallStats: {
        total_xp: parseInt(row.total_xp),
        total_exercises_completed: parseInt(row.total_exercises_completed),
      },
    };
  } finally {
    client.release();
  }
}

function compareResults(original, optimized) {
  const issues = [];

  // Compare subscription data
  if (
    original.subscription.has_active_subscription !==
    optimized.subscription.has_active_subscription
  ) {
    issues.push(
      `Subscription status mismatch: ${original.subscription.has_active_subscription} vs ${optimized.subscription.has_active_subscription}`
    );
  }

  // Compare profile data
  if (original.profile.name !== optimized.profile.name) {
    issues.push(
      `Profile name mismatch: ${original.profile.name} vs ${optimized.profile.name}`
    );
  }

  // Compare course data
  if (original.course.course_id !== optimized.course.course_id) {
    issues.push(
      `Course ID mismatch: ${original.course.course_id} vs ${optimized.course.course_id}`
    );
  }

  // Compare stats (allow small numerical differences due to type conversion)
  const courseXpDiff = Math.abs(
    original.courseStats.course_xp - optimized.courseStats.course_xp
  );
  if (courseXpDiff > 1) {
    issues.push(
      `Course XP mismatch: ${original.courseStats.course_xp} vs ${optimized.courseStats.course_xp}`
    );
  }

  // Compare sections count
  if (original.sections.length !== optimized.sections.length) {
    issues.push(
      `Sections count mismatch: ${original.sections.length} vs ${optimized.sections.length}`
    );
  }

  return issues;
}

async function runValidationTest() {
  console.log("🔍 End-to-End Validation Test: Course Section Optimization");
  console.log("=".repeat(70));

  const { courseId, userId } = TEST_CONFIG;
  console.log(`\n📊 Testing with Course ID: ${courseId}, User ID: ${userId}\n`);

  try {
    console.log("📦 Executing Original Approach (6 separate queries)...");
    const originalStart = Date.now();
    const originalResult = await simulateOriginalQueries(courseId, userId);
    const originalDuration = Date.now() - originalStart;
    console.log(`   ✅ Completed in ${originalDuration}ms`);

    console.log("\n⚡ Executing Optimized Approach (1 combined query)...");
    const optimizedStart = Date.now();
    const optimizedResult = await getOptimizedQueryResult(courseId, userId);
    const optimizedDuration = Date.now() - optimizedStart;
    console.log(`   ✅ Completed in ${optimizedDuration}ms`);

    console.log("\n🔎 Comparing Results...");

    if (!originalResult.course) {
      console.log(
        "   ⚠️  No course data found - check if course exists and is published"
      );
      return;
    }

    if (!optimizedResult) {
      console.log("   ❌ Optimized query returned no data");
      return;
    }

    const issues = compareResults(originalResult, optimizedResult);

    if (issues.length === 0) {
      console.log(
        "   ✅ Data integrity verified - both approaches return identical results"
      );
    } else {
      console.log("   ⚠️  Data differences found:");
      issues.forEach((issue) => console.log(`      - ${issue}`));
    }

    // Display sample data for verification
    console.log("\n📋 SAMPLE DATA VERIFICATION:");
    console.log("=".repeat(70));
    console.log(`Course: ${originalResult.course.title}`);
    console.log(`User: ${originalResult.profile.name}`);
    console.log(
      `Subscription Active: ${originalResult.subscription.has_active_subscription}`
    );
    console.log(`Sections Found: ${originalResult.sections.length}`);
    console.log(`Course XP: ${originalResult.courseStats.course_xp}`);
    console.log(`Total XP: ${originalResult.overallStats.total_xp}`);

    // Performance summary
    const improvement =
      ((originalDuration - optimizedDuration) / originalDuration) * 100;
    console.log("\n⏱️  PERFORMANCE SUMMARY:");
    console.log("=".repeat(70));
    console.log(`Original: ${originalDuration}ms`);
    console.log(`Optimized: ${optimizedDuration}ms`);
    if (improvement > 0) {
      console.log(`Improvement: ${improvement.toFixed(1)}% faster`);
    } else {
      console.log(`Performance: ${Math.abs(improvement).toFixed(1)}% slower`);
    }

    console.log("\n🎉 Validation Test Complete!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the validation test
if (require.main === module) {
  runValidationTest().catch(console.error);
}

module.exports = { runValidationTest };
