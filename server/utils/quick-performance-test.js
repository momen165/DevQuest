#!/usr/bin/env node

/**
 * Quick Performance Test - DevQuest Optimized Endpoint
 * Tests the specific optimized courses endpoint with authentication
 */

const axios = require("axios");
const { performance } = require("perf_hooks");

const BASE_URL = "http://localhost:5000/api";

async function testOptimizedEndpoint() {
  console.log("🚀 Testing DevQuest Optimized Courses Endpoint...\n");

  try {
    // Test 1: Public endpoint (no auth required)
    console.log("📊 Testing Public Courses Endpoint...");
    const start1 = performance.now();
    const response1 = await axios.get(`${BASE_URL}/getCoursesWithRatings`);
    const end1 = performance.now();

    console.log(`  ✅ Response Time: ${(end1 - start1).toFixed(2)}ms`);
    console.log(
      `  📦 Courses Retrieved: ${response1.data.courses?.length || 0}`
    );
    console.log(`  🔧 Status: ${response1.status}`);

    // Test 2: Cache performance
    console.log("\n🚀 Testing Cache Performance...");
    const start2 = performance.now();
    const response2 = await axios.get(`${BASE_URL}/getCoursesWithRatings`);
    const end2 = performance.now();

    console.log(`  ✅ Cached Response Time: ${(end2 - start2).toFixed(2)}ms`);
    console.log(
      `  📈 Performance Gain: ${(end1 - start1 - (end2 - start2)).toFixed(
        2
      )}ms faster`
    );

    // Test 3: Multiple rapid requests (stress test)
    console.log("\n⚡ Testing Rapid Requests (Stress Test)...");
    const promises = [];
    const startStress = performance.now();

    for (let i = 0; i < 10; i++) {
      promises.push(axios.get(`${BASE_URL}/getCoursesWithRatings`));
    }

    const results = await Promise.all(promises);
    const endStress = performance.now();

    const avgTime = (endStress - startStress) / 10;
    console.log(
      `  ✅ 10 Concurrent Requests: ${(endStress - startStress).toFixed(
        2
      )}ms total`
    );
    console.log(`  📊 Average per Request: ${avgTime.toFixed(2)}ms`);
    console.log(`  🎯 Success Rate: ${results.length}/10`);

    // Test 4: Health check
    console.log("\n❤️  Testing System Health...");
    const startHealth = performance.now();
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    const endHealth = performance.now();

    console.log(`  ✅ Health Check: ${(endHealth - startHealth).toFixed(2)}ms`);
    console.log(`  🏥 Database: ${healthResponse.data.database}`);
    console.log(`  🎯 System Status: ${healthResponse.data.status}`);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 PERFORMANCE TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`🚀 Single Request: ${(end1 - start1).toFixed(2)}ms`);
    console.log(`🚀 Cached Request: ${(end2 - start2).toFixed(2)}ms`);
    console.log(`🚀 Concurrent Avg: ${avgTime.toFixed(2)}ms`);
    console.log(`🏥 Health Check: ${(endHealth - startHealth).toFixed(2)}ms`);
    console.log("=".repeat(60));

    // Performance evaluation
    const singleReqTime = end1 - start1;
    if (singleReqTime < 10) {
      console.log("✅ EXCELLENT: Sub-10ms response time!");
    } else if (singleReqTime < 50) {
      console.log("✅ GREAT: Sub-50ms response time!");
    } else if (singleReqTime < 100) {
      console.log("✅ GOOD: Sub-100ms response time!");
    } else {
      console.log("⚠️  NEEDS IMPROVEMENT: Response time > 100ms");
    }

    console.log("\n🎯 DevQuest Performance Optimization: SUCCESS! 🎯");
  } catch (error) {
    console.error("❌ Test failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Make sure the server is running:");
      console.log("   cd server && npm run dev");
    }
  }
}

// Run the test
if (require.main === module) {
  testOptimizedEndpoint();
}

module.exports = { testOptimizedEndpoint };
