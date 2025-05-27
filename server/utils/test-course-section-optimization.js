#!/usr/bin/env node

/**
 * Performance test for the optimized course section endpoint
 * This test compares the new optimized endpoint vs the original 6 separate API calls
 */

const axios = require("axios");

const API_BASE = "http://localhost:5000/api";

// Test configuration
const TEST_CONFIG = {
  courseId: 1, // Use a known course ID
  userId: 1, // Use a known user ID
  iterations: 10,
};

// Mock authentication token (you'll need to replace with a real token)
const getAuthToken = async () => {
  try {
    // You might need to implement actual login here
    // For now, return a placeholder - replace with actual token
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      email: "test@example.com", // Replace with actual test credentials
      password: "testpassword",
    });
    return loginResponse.data.token;
  } catch (error) {
    console.log(
      "Note: Using mock token for testing. Replace with actual authentication."
    );
    return "mock-token-for-testing";
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function testOriginalApproach(token, courseId, userId) {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  };

  const start = Date.now();

  try {
    // Simulate the original 6 API calls that CourseSection.jsx was making
    const [
      subscriptionResponse,
      profileResponse,
      courseResponse,
      sectionsResponse,
      courseStatsResponse,
      overallStatsResponse,
    ] = await Promise.all([
      axios.get(`${API_BASE}/check`, config),
      axios.get(`${API_BASE}/students/${userId}`, config),
      axios.get(`${API_BASE}/courses/${courseId}`, config),
      axios.get(`${API_BASE}/sections/course/${courseId}`, config),
      axios.get(`${API_BASE}/student/courses/${courseId}/stats`, config),
      axios.get(`${API_BASE}/student/stats/${userId}`, config),
    ]);

    const duration = Date.now() - start;

    return {
      success: true,
      duration,
      dataPoints: 6,
      totalRequests: 6,
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - start,
      error: error.message,
      dataPoints: 0,
      totalRequests: 6,
    };
  }
}

async function testOptimizedApproach(token, courseId) {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  };

  const start = Date.now();

  try {
    // Test the new optimized endpoint
    const response = await axios.get(
      `${API_BASE}/optimized-course-section/${courseId}`,
      config
    );
    const duration = Date.now() - start;

    return {
      success: true,
      duration,
      dataPoints: response.data.optimized ? "all-in-one" : "fallback",
      totalRequests: 1,
      optimized: response.data.optimized || false,
      cached: response.data.cached || false,
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - start,
      error: error.message,
      dataPoints: 0,
      totalRequests: 1,
    };
  }
}

async function runPerformanceComparison() {
  console.log("🚀 Testing CourseSection.jsx Performance Optimization");
  console.log("=".repeat(60));

  const token = await getAuthToken();
  const { courseId, userId, iterations } = TEST_CONFIG;

  // Results storage
  const originalResults = [];
  const optimizedResults = [];

  console.log(`\n📊 Running ${iterations} iterations for each approach...\n`);

  // Test original approach
  console.log("🔍 Testing Original Approach (6 separate API calls)...");
  for (let i = 0; i < iterations; i++) {
    await sleep(100); // Small delay between requests
    const result = await testOriginalApproach(token, courseId, userId);
    originalResults.push(result);

    if (result.success) {
      console.log(`  ✅ Iteration ${i + 1}: ${result.duration}ms`);
    } else {
      console.log(`  ❌ Iteration ${i + 1}: Failed - ${result.error}`);
    }
  }

  await sleep(1000); // Pause between test sets

  // Test optimized approach
  console.log("\n⚡ Testing Optimized Approach (1 combined API call)...");
  for (let i = 0; i < iterations; i++) {
    await sleep(100); // Small delay between requests
    const result = await testOptimizedApproach(token, courseId);
    optimizedResults.push(result);

    if (result.success) {
      const cacheStatus = result.cached ? "(cached)" : "(fresh)";
      console.log(
        `  ✅ Iteration ${i + 1}: ${result.duration}ms ${cacheStatus}`
      );
    } else {
      console.log(`  ❌ Iteration ${i + 1}: Failed - ${result.error}`);
    }
  }

  // Calculate statistics
  const originalSuccessful = originalResults.filter((r) => r.success);
  const optimizedSuccessful = optimizedResults.filter((r) => r.success);

  if (originalSuccessful.length === 0 || optimizedSuccessful.length === 0) {
    console.log("\n❌ Insufficient successful requests for comparison");
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
  console.log("\n📈 PERFORMANCE COMPARISON RESULTS");
  console.log("=".repeat(60));
  console.log(`📦 Original Approach (6 API calls):`);
  console.log(`   Average: ${originalAvg.toFixed(2)}ms`);
  console.log(
    `   Success Rate: ${originalSuccessful.length}/${iterations} (${(
      (originalSuccessful.length / iterations) *
      100
    ).toFixed(1)}%)`
  );

  console.log(`\n⚡ Optimized Approach (1 API call):`);
  console.log(`   Average: ${optimizedAvg.toFixed(2)}ms`);
  console.log(
    `   Success Rate: ${optimizedSuccessful.length}/${iterations} (${(
      (optimizedSuccessful.length / iterations) *
      100
    ).toFixed(1)}%)`
  );

  console.log(`\n🎯 PERFORMANCE IMPROVEMENT:`);
  if (improvement > 0) {
    console.log(`   ✅ ${improvement.toFixed(1)}% faster`);
    console.log(`   ✅ ${speedup.toFixed(2)}x speed improvement`);
    console.log(`   ✅ Reduced from 6 to 1 API call (83% fewer requests)`);
  } else {
    console.log(
      `   ⚠️  ${Math.abs(improvement).toFixed(1)}% slower (needs investigation)`
    );
  }

  // Cache analysis
  const cachedResponses = optimizedSuccessful.filter((r) => r.cached).length;
  if (cachedResponses > 0) {
    console.log(`\n💾 Cache Performance:`);
    console.log(
      `   ${cachedResponses}/${optimizedSuccessful.length} responses served from cache`
    );
    console.log(
      `   Cache hit rate: ${(
        (cachedResponses / optimizedSuccessful.length) *
        100
      ).toFixed(1)}%`
    );
  }

  console.log("\n🎉 Test Complete!");
}

// Run the test
if (require.main === module) {
  runPerformanceComparison().catch(console.error);
}

module.exports = { runPerformanceComparison };
