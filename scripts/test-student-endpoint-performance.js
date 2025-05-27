#!/usr/bin/env node

/**
 * Performance Test Script for /api/students/:id endpoint
 *
 * This script tests the performance of the optimized student endpoint
 * and compares response times to validate the improvements.
 */

const axios = require("axios");

// Configuration
const CONFIG = {
  BASE_URL: process.env.API_URL || "http://localhost:5000/api",
  STUDENT_ID: process.env.TEST_STUDENT_ID || "1",
  NUM_TESTS: 10,
  CONCURRENT_REQUESTS: 3,
  EXPECTED_RESPONSE_TIME_MS: 500, // Target response time after optimization
};

// Test data
let authToken = null;
const testResults = {
  responseTimes: [],
  errors: [],
  cacheHits: 0,
  totalRequests: 0,
};

/**
 * Get authentication token for testing
 */
async function authenticate() {
  try {
    // This is a placeholder - you'll need to implement based on your auth system
    console.log("Note: Add authentication logic for your specific system");
    console.log("For now, using a dummy token or admin credentials");

    // Example auth request (adjust based on your authentication system)
    // const authResponse = await axios.post(`${CONFIG.BASE_URL}/auth/login`, {
    //   email: 'admin@example.com',
    //   password: 'admin_password'
    // });
    // authToken = authResponse.data.token;

    authToken = "dummy_token_for_testing"; // Replace with actual token
    return true;
  } catch (error) {
    console.error("Authentication failed:", error.message);
    return false;
  }
}

/**
 * Make a single request to the student endpoint
 */
async function testStudentEndpoint() {
  const startTime = Date.now();

  try {
    const response = await axios.get(
      `${CONFIG.BASE_URL}/students/${CONFIG.STUDENT_ID}`,
      {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        timeout: 5000, // 5 second timeout
      }
    );

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    testResults.responseTimes.push(responseTime);
    testResults.totalRequests++;

    // Check if response was cached (look for cache headers or response indicators)
    if (response.headers["x-cache"] === "HIT" || response.data.cached) {
      testResults.cacheHits++;
    }

    return {
      success: true,
      responseTime,
      dataSize: JSON.stringify(response.data).length,
      optimized: response.data.optimized || false,
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    testResults.errors.push({
      responseTime,
      error: error.message,
      status: error.response?.status,
    });

    return {
      success: false,
      responseTime,
      error: error.message,
    };
  }
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
  console.log("🚀 Starting Student Endpoint Performance Tests");
  console.log(`Target URL: ${CONFIG.BASE_URL}/students/${CONFIG.STUDENT_ID}`);
  console.log(`Number of tests: ${CONFIG.NUM_TESTS}`);
  console.log(`Concurrent requests: ${CONFIG.CONCURRENT_REQUESTS}`);
  console.log("─".repeat(60));

  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.error("❌ Authentication failed. Cannot proceed with tests.");
    process.exit(1);
  }

  // Run sequential tests first (to warm up cache)
  console.log("🔄 Running initial sequential tests...");
  for (let i = 0; i < 3; i++) {
    const result = await testStudentEndpoint();
    console.log(
      `Test ${i + 1}: ${result.responseTime}ms ${result.success ? "✅" : "❌"}`
    );
  }

  console.log("\n🔄 Running concurrent performance tests...");

  // Run concurrent tests
  const testPromises = [];
  for (
    let batch = 0;
    batch < Math.ceil(CONFIG.NUM_TESTS / CONFIG.CONCURRENT_REQUESTS);
    batch++
  ) {
    const batchPromises = [];

    for (
      let i = 0;
      i < CONFIG.CONCURRENT_REQUESTS &&
      testResults.totalRequests < CONFIG.NUM_TESTS;
      i++
    ) {
      batchPromises.push(testStudentEndpoint());
    }

    const results = await Promise.allSettled(batchPromises);

    results.forEach((result, index) => {
      const testNum = batch * CONFIG.CONCURRENT_REQUESTS + index + 4; // +4 for the initial tests
      if (result.status === "fulfilled") {
        const { responseTime, success } = result.value;
        console.log(
          `Test ${testNum}: ${responseTime}ms ${success ? "✅" : "❌"}`
        );
      }
    });

    // Small delay between batches
    if (batch < Math.ceil(CONFIG.NUM_TESTS / CONFIG.CONCURRENT_REQUESTS) - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * Calculate and display test results
 */
function displayResults() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 PERFORMANCE TEST RESULTS");
  console.log("=".repeat(60));

  if (testResults.responseTimes.length === 0) {
    console.log("❌ No successful requests to analyze");
    return;
  }

  // Calculate statistics
  const times = testResults.responseTimes;
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const medianTime = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

  // Performance analysis
  const fastRequests = times.filter(
    (t) => t < CONFIG.EXPECTED_RESPONSE_TIME_MS
  ).length;
  const successRate = (times.length / testResults.totalRequests) * 100;
  const cacheHitRate =
    (testResults.cacheHits / testResults.totalRequests) * 100;

  // Display metrics
  console.log(`📈 Response Time Statistics:`);
  console.log(`   Average: ${avgTime.toFixed(1)}ms`);
  console.log(`   Median:  ${medianTime}ms`);
  console.log(`   Min:     ${minTime}ms`);
  console.log(`   Max:     ${maxTime}ms`);

  console.log(`\n📊 Performance Metrics:`);
  console.log(`   Success Rate:     ${successRate.toFixed(1)}%`);
  console.log(`   Cache Hit Rate:   ${cacheHitRate.toFixed(1)}%`);
  console.log(
    `   Fast Responses:   ${fastRequests}/${times.length} (< ${CONFIG.EXPECTED_RESPONSE_TIME_MS}ms)`
  );
  console.log(`   Total Errors:     ${testResults.errors.length}`);

  // Performance assessment
  console.log(`\n🎯 Performance Assessment:`);
  if (avgTime < CONFIG.EXPECTED_RESPONSE_TIME_MS) {
    console.log(
      `   ✅ EXCELLENT - Average response time is under target (${CONFIG.EXPECTED_RESPONSE_TIME_MS}ms)`
    );
  } else if (avgTime < CONFIG.EXPECTED_RESPONSE_TIME_MS * 1.5) {
    console.log(
      `   ⚠️  ACCEPTABLE - Average response time is slightly above target`
    );
  } else {
    console.log(
      `   ❌ NEEDS IMPROVEMENT - Average response time exceeds target significantly`
    );
  }

  if (cacheHitRate > 50) {
    console.log(
      `   ✅ Good cache utilization (${cacheHitRate.toFixed(1)}% hit rate)`
    );
  } else if (cacheHitRate > 0) {
    console.log(
      `   ⚠️  Low cache utilization (${cacheHitRate.toFixed(1)}% hit rate)`
    );
  } else {
    console.log(`   ❌ No cache hits detected - verify cache implementation`);
  }

  // Recommendations
  console.log(`\n💡 Recommendations:`);
  if (avgTime > CONFIG.EXPECTED_RESPONSE_TIME_MS) {
    console.log(`   • Consider further database query optimization`);
    console.log(`   • Review cache TTL settings (currently 180s)`);
    console.log(`   • Consider adding database indexes if not present`);
  }

  if (cacheHitRate < 30) {
    console.log(`   • Verify cache middleware is properly configured`);
    console.log(`   • Check if cache TTL is too short for the use case`);
    console.log(`   • Monitor cache memory usage and eviction policies`);
  }

  if (testResults.errors.length > 0) {
    console.log(
      `   • Review error logs for ${testResults.errors.length} failed requests`
    );
    console.log(`   • Common errors:`, [
      ...new Set(testResults.errors.map((e) => e.error)),
    ]);
  }

  console.log("\n" + "=".repeat(60));
}

/**
 * Main execution
 */
async function main() {
  try {
    await runPerformanceTests();
    displayResults();

    // Exit with appropriate code
    const avgTime =
      testResults.responseTimes.reduce((a, b) => a + b, 0) /
      testResults.responseTimes.length;
    const success =
      avgTime < CONFIG.EXPECTED_RESPONSE_TIME_MS &&
      testResults.errors.length === 0;

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("❌ Test execution failed:", error.message);
    process.exit(1);
  }
}

// Handle CLI arguments
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Student Endpoint Performance Test Script

Usage: node test-student-endpoint-performance.js [options]

Environment Variables:
  API_URL          Base API URL (default: http://localhost:5000/api)
  TEST_STUDENT_ID  Student ID to test (default: 1)

Options:
  --help, -h       Show this help message

Example:
  API_URL=http://localhost:5000/api TEST_STUDENT_ID=1 node test-student-endpoint-performance.js
  `);
  process.exit(0);
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  testStudentEndpoint,
  runPerformanceTests,
  displayResults,
};
