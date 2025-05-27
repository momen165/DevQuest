#!/usr/bin/env node

/**
 * Section Endpoint Performance Testing Script
 * Tests the performance of /api/sections/:id endpoint
 *
 * Usage: node scripts/test-section-endpoint-performance.js [section_id]
 * Default section_id: 6
 */

const axios = require("axios");

// Configuration
const CONFIG = {
  baseURL: "http://localhost:5000/api",
  testSectionId: process.argv[2] || "6", // Default to section 6
  warmupRuns: 2,
  testRuns: 5,
  timeoutMs: 10000,
  targetResponseTime: 500, // Target: under 500ms
  credentials: {
    email: "admin@devquest.com",
    password: "Admin123!",
  },
};

class SectionPerformanceTester {
  constructor() {
    this.authToken = null;
    this.results = [];
  }

  /**
   * Authenticate and get access token
   */
  async authenticate() {
    try {
      console.log("🔐 Authenticating...");
      const response = await axios.post(
        `${CONFIG.baseURL}/login`,
        CONFIG.credentials,
        {
          timeout: CONFIG.timeoutMs,
        }
      );

      if (response.data.token) {
        this.authToken = response.data.token;
        console.log("✅ Authentication successful");
        return true;
      } else {
        throw new Error("No token received");
      }
    } catch (error) {
      console.error("❌ Authentication failed:", error.message);
      return false;
    }
  }

  /**
   * Clear cache by making a request with cache-busting
   */
  async clearCache() {
    try {
      await axios.get(`${CONFIG.baseURL}/sections/${CONFIG.testSectionId}`, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
    } catch (error) {
      // Ignore errors, this is just for cache clearing
    }
  }

  /**
   * Test section endpoint performance
   */
  async testSectionEndpoint(testType = "cold") {
    const startTime = process.hrtime.bigint();

    try {
      const response = await axios.get(
        `${CONFIG.baseURL}/sections/${CONFIG.testSectionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
          timeout: CONFIG.timeoutMs,
        }
      );

      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      const result = {
        testType,
        responseTime,
        status: response.status,
        success: true,
        cached: response.data.cached || false,
        sectionId: response.data.section_id,
        sectionName: response.data.name,
        timestamp: new Date().toISOString(),
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000;

      const result = {
        testType,
        responseTime,
        status: error.response?.status || 0,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      this.results.push(result);
      return result;
    }
  }

  /**
   * Validate response structure
   */
  validateResponse(response) {
    const issues = [];

    if (!response.data) {
      issues.push("Missing response data");
      return issues;
    }

    const data = response.data;
    const requiredFields = ["section_id", "name", "course_id"];

    requiredFields.forEach((field) => {
      if (data[field] === undefined || data[field] === null) {
        issues.push(`Missing required field: ${field}`);
      }
    });

    return issues;
  }

  /**
   * Run performance tests
   */
  async runTests() {
    console.log(`\n🚀 Starting Section Endpoint Performance Tests`);
    console.log(`📊 Target Section ID: ${CONFIG.testSectionId}`);
    console.log(`🎯 Target Response Time: ${CONFIG.targetResponseTime}ms`);
    console.log(`🔄 Warmup Runs: ${CONFIG.warmupRuns}`);
    console.log(`📈 Test Runs: ${CONFIG.testRuns}`);
    console.log("=" * 60);

    // Authenticate
    if (!(await this.authenticate())) {
      return;
    }

    // Warmup runs
    console.log("\n🔥 Warmup Runs:");
    for (let i = 1; i <= CONFIG.warmupRuns; i++) {
      await this.clearCache();
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay

      const result = await this.testSectionEndpoint("warmup");
      console.log(
        `   Run ${i}: ${
          result.success ? "✅" : "❌"
        } ${result.responseTime.toFixed(2)}ms`
      );
    }

    // Cold cache test (first real test)
    console.log("\n❄️  Cold Cache Test:");
    await this.clearCache();
    await new Promise((resolve) => setTimeout(resolve, 200)); // Ensure cache is cleared

    const coldResult = await this.testSectionEndpoint("cold");
    console.log(
      `   ${coldResult.success ? "✅" : "❌"} ${coldResult.responseTime.toFixed(
        2
      )}ms ${coldResult.cached ? "(cached)" : "(fresh)"}`
    );

    // Warm cache tests
    console.log("\n🔥 Warm Cache Tests:");
    for (let i = 1; i <= CONFIG.testRuns; i++) {
      const result = await this.testSectionEndpoint("warm");
      console.log(
        `   Run ${i}: ${
          result.success ? "✅" : "❌"
        } ${result.responseTime.toFixed(2)}ms ${
          result.cached ? "(cached)" : "(fresh)"
        }`
      );

      // Small delay between requests
      if (i < CONFIG.testRuns) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    // Test response validation
    console.log("\n🧪 Response Validation:");
    try {
      const validationResponse = await axios.get(
        `${CONFIG.baseURL}/sections/${CONFIG.testSectionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        }
      );

      const issues = this.validateResponse(validationResponse);
      if (issues.length === 0) {
        console.log("   ✅ Response structure valid");
        console.log(`   📋 Section: ${validationResponse.data.name}`);
        console.log(`   🆔 Section ID: ${validationResponse.data.section_id}`);
        console.log(`   📚 Course ID: ${validationResponse.data.course_id}`);
      } else {
        console.log("   ❌ Response validation issues:");
        issues.forEach((issue) => console.log(`      - ${issue}`));
      }
    } catch (error) {
      console.log(`   ❌ Response validation failed: ${error.message}`);
    }

    this.generateReport();
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const successfulResults = this.results.filter((r) => r.success);
    const coldResults = successfulResults.filter((r) => r.testType === "cold");
    const warmResults = successfulResults.filter((r) => r.testType === "warm");

    if (successfulResults.length === 0) {
      console.log("\n❌ No successful tests to analyze");
      return;
    }

    console.log("\n" + "=" * 60);
    console.log("📊 PERFORMANCE ANALYSIS REPORT");
    console.log("=" * 60);

    // Cold cache analysis
    if (coldResults.length > 0) {
      const coldAvg =
        coldResults.reduce((sum, r) => sum + r.responseTime, 0) /
        coldResults.length;
      console.log(`\n❄️  Cold Cache Performance:`);
      console.log(`   Average: ${coldAvg.toFixed(2)}ms`);
      console.log(`   Target: ${CONFIG.targetResponseTime}ms`);
      console.log(
        `   Status: ${
          coldAvg <= CONFIG.targetResponseTime ? "✅ PASS" : "❌ FAIL"
        }`
      );
    }

    // Warm cache analysis
    if (warmResults.length > 0) {
      const warmTimes = warmResults.map((r) => r.responseTime);
      const warmAvg =
        warmTimes.reduce((sum, time) => sum + time, 0) / warmTimes.length;
      const warmMin = Math.min(...warmTimes);
      const warmMax = Math.max(...warmTimes);

      console.log(`\n🔥 Warm Cache Performance:`);
      console.log(`   Average: ${warmAvg.toFixed(2)}ms`);
      console.log(`   Min: ${warmMin.toFixed(2)}ms`);
      console.log(`   Max: ${warmMax.toFixed(2)}ms`);
      console.log(`   Target: ${CONFIG.targetResponseTime}ms`);
      console.log(
        `   Status: ${
          warmAvg <= CONFIG.targetResponseTime ? "✅ PASS" : "❌ FAIL"
        }`
      );
    }

    // Overall statistics
    const allTimes = successfulResults.map((r) => r.responseTime);
    const overallAvg =
      allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
    const failedTests = this.results.filter((r) => !r.success).length;

    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total Tests: ${this.results.length}`);
    console.log(`   Successful: ${successfulResults.length}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Overall Average: ${overallAvg.toFixed(2)}ms`);
    console.log(
      `   Success Rate: ${(
        (successfulResults.length / this.results.length) *
        100
      ).toFixed(1)}%`
    );

    // Performance recommendations
    console.log(`\n💡 Recommendations:`);
    if (
      coldResults.length > 0 &&
      coldResults[0].responseTime > CONFIG.targetResponseTime
    ) {
      console.log(
        `   🔧 Cold cache response time (${coldResults[0].responseTime.toFixed(
          2
        )}ms) exceeds target`
      );
      console.log(`   🚀 Consider implementing database query optimization`);
      console.log(`   📊 Consider adding caching middleware`);
    }

    if (
      warmResults.length > 0 &&
      warmResults.some((r) => r.responseTime > 100)
    ) {
      console.log(`   ⚡ Some warm cache responses are slow`);
      console.log(`   🔍 Check cache hit rates and TTL settings`);
    }

    if (
      successfulResults.every(
        (r) => r.responseTime <= CONFIG.targetResponseTime
      )
    ) {
      console.log(`   ✅ All tests meet performance targets!`);
    }

    console.log("\n" + "=" * 60);
  }
}

// Run the tests
if (require.main === module) {
  const tester = new SectionPerformanceTester();
  tester.runTests().catch((error) => {
    console.error("❌ Test execution failed:", error.message);
    process.exit(1);
  });
}

module.exports = SectionPerformanceTester;
