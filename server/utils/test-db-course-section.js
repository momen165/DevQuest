#!/usr/bin/env node

/**
 * Database Performance Test for Course Section Optimization
 * Tests the SQL performance of the new optimized query vs individual queries
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
  courseId: 1,
  userId: 1,
  iterations: 5,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function testOriginalQueries(courseId, userId) {
  const client = await pool.connect();
  const start = Date.now();

  try {
    // Simulate the 6 separate queries that were being made
    const queries = [
      // 1. Subscription check
      `SELECT 
        CASE 
          WHEN s.status = 'active' AND s.subscription_end_date > NOW() THEN true 
          ELSE false 
        END as has_active_subscription
       FROM users u
       LEFT JOIN subscription s ON u.user_id = s.user_id
       WHERE u.user_id = $1`,

      // 2. Profile data
      `SELECT name, profileimage, streak FROM users WHERE user_id = $1`,

      // 3. Course data
      `SELECT course_id, name as title, description, status FROM course WHERE course_id = $1`,

      // 4. Sections with lessons
      `SELECT 
        s.section_id, s.name, s.description, s.section_order,
        l.lesson_id, l.name as lesson_name, l.lesson_order,
        COALESCE(lp.completed, false) as completed
       FROM section s
       LEFT JOIN lesson l ON s.section_id = l.section_id
       LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $2
       WHERE s.course_id = $1
       ORDER BY s.section_order, l.lesson_order`,

      // 5. Course stats
      `SELECT 
        COALESCE(SUM(l.xp), 0) as course_xp,
        COUNT(DISTINCT lp.lesson_id) as exercises_completed
       FROM lesson_progress lp
       JOIN lesson l ON lp.lesson_id = l.lesson_id
       JOIN section s ON l.section_id = s.section_id
       WHERE lp.user_id = $2 AND s.course_id = $1 AND lp.completed = true`,

      // 6. Overall stats
      `SELECT 
        COALESCE(SUM(l.xp), 0) as total_xp,
        COUNT(DISTINCT lp.lesson_id) as total_exercises_completed
       FROM lesson_progress lp
       LEFT JOIN lesson l ON lp.lesson_id = l.lesson_id
       WHERE lp.user_id = $1 AND lp.completed = true`,
    ];

    // Execute all queries
    const results = await Promise.all([
      client.query(queries[0], [userId]),
      client.query(queries[1], [userId]),
      client.query(queries[2], [courseId]),
      client.query(queries[3], [courseId, userId]),
      client.query(queries[4], [courseId, userId]),
      client.query(queries[5], [userId]),
    ]);

    const duration = Date.now() - start;

    return {
      success: true,
      duration,
      queries: queries.length,
      results: results.map((r) => r.rowCount),
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - start,
      error: error.message,
    };
  } finally {
    client.release();
  }
}

async function testOptimizedQuery(courseId, userId) {
  const client = await pool.connect();
  const start = Date.now();

  try {
    // The optimized single query
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
      subscription_info AS (        SELECT 
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
    const duration = Date.now() - start;

    return {
      success: true,
      duration,
      queries: 1,
      results: [result.rowCount],
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - start,
      error: error.message,
    };
  } finally {
    client.release();
  }
}

async function runDatabasePerformanceTest() {
  console.log("🔬 Database Performance Test: Course Section Optimization");
  console.log("=".repeat(70));

  const { courseId, userId, iterations } = TEST_CONFIG;

  console.log(`\n📊 Testing with Course ID: ${courseId}, User ID: ${userId}`);
  console.log(`🔄 Running ${iterations} iterations for each approach...\n`);

  // Test original approach
  console.log("📦 Testing Original Approach (6 separate queries)...");
  const originalResults = [];

  for (let i = 0; i < iterations; i++) {
    await sleep(100);
    const result = await testOriginalQueries(courseId, userId);
    originalResults.push(result);

    if (result.success) {
      console.log(`  ✅ Iteration ${i + 1}: ${result.duration}ms`);
    } else {
      console.log(`  ❌ Iteration ${i + 1}: Failed - ${result.error}`);
    }
  }

  await sleep(500);

  // Test optimized approach
  console.log("\n⚡ Testing Optimized Approach (1 combined query)...");
  const optimizedResults = [];

  for (let i = 0; i < iterations; i++) {
    await sleep(100);
    const result = await testOptimizedQuery(courseId, userId);
    optimizedResults.push(result);

    if (result.success) {
      console.log(`  ✅ Iteration ${i + 1}: ${result.duration}ms`);
    } else {
      console.log(`  ❌ Iteration ${i + 1}: Failed - ${result.error}`);
    }
  }

  // Calculate statistics
  const originalSuccessful = originalResults.filter((r) => r.success);
  const optimizedSuccessful = optimizedResults.filter((r) => r.success);

  if (originalSuccessful.length === 0 || optimizedSuccessful.length === 0) {
    console.log("\n❌ Insufficient successful queries for comparison");
    console.log("Make sure the database is running and contains test data");
    return;
  }

  const originalAvg =
    originalSuccessful.reduce((sum, r) => sum + r.duration, 0) /
    originalSuccessful.length;
  const optimizedAvg =
    optimizedSuccessful.reduce((sum, r) => sum + r.duration, 0) /
    optimizedSuccessful.length;

  const improvement = ((originalAvg - optimizedAvg) / originalAvg) * 100;
  const speedup = originalAvg / optimizedAvg;

  // Display results
  console.log("\n📈 DATABASE PERFORMANCE RESULTS");
  console.log("=".repeat(70));
  console.log(`📦 Original Approach (6 queries):`);
  console.log(`   Average: ${originalAvg.toFixed(2)}ms`);
  console.log(`   Success Rate: ${originalSuccessful.length}/${iterations}`);

  console.log(`\n⚡ Optimized Approach (1 query):`);
  console.log(`   Average: ${optimizedAvg.toFixed(2)}ms`);
  console.log(`   Success Rate: ${optimizedSuccessful.length}/${iterations}`);

  console.log(`\n🎯 PERFORMANCE IMPROVEMENT:`);
  if (improvement > 0) {
    console.log(`   ✅ ${improvement.toFixed(1)}% faster database queries`);
    console.log(`   ✅ ${speedup.toFixed(2)}x speed improvement`);
    console.log(`   ✅ Reduced from 6 to 1 query (83% fewer DB calls)`);
    console.log(`   ✅ Less network latency and connection overhead`);
  } else {
    console.log(
      `   ⚠️  ${Math.abs(improvement).toFixed(
        1
      )}% slower (complex query overhead)`
    );
  }

  console.log("\n🎉 Database Test Complete!");

  await pool.end();
}

// Run the test
if (require.main === module) {
  runDatabasePerformanceTest().catch(console.error);
}

module.exports = { runDatabasePerformanceTest };
