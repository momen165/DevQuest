/**
 * Performance Test Script for Students List Endpoint (/api/students)
 *
 * This script tests and measures the performance improvements made to the
 * students list endpoint after optimization.
 *
 * Usage: node scripts/test-students-list-performance.js
 */

const axios = require("axios");
const fs = require("fs");

// Configuration
const CONFIG = {
  baseURL: process.env.API_URL || "http://localhost:5000/api",
  adminCredentials: {
    email: process.env.ADMIN_EMAIL || "admin@example.com",
    password: process.env.ADMIN_PASSWORD || "admin123",
  },
  testRuns: 10, // Number of test iterations
  warmupRuns: 3, // Number of warmup runs (excluded from results)
};

class StudentsListPerformanceTester {
  constructor() {
    this.authToken = null;
    this.results = {
      firstRequest: [], // Cold cache results
      cachedRequests: [], // Warm cache results
      responseSizes: [],
      metadata: {},
    };
  }

  /**
   * Authenticate as admin user
   */
  async authenticate() {
    try {
      console.log("🔐 Authenticating as admin user...");
      const response = await axios.post(
        `${CONFIG.baseURL}/auth/login`,
        CONFIG.adminCredentials
      );

      if (response.data.token) {
        this.authToken = response.data.token;
        console.log("✅ Authentication successful");
        return true;
      } else {
        throw new Error("No token received");
      }
    } catch (error) {
      console.error(
        "❌ Authentication failed:",
        error.response?.data?.message || error.message
      );
      return false;
    }
  }

  /**
   * Make a request to the students list endpoint
   */
  async makeRequest() {
    const startTime = performance.now();

    try {
      const response = await axios.get(`${CONFIG.baseURL}/students`, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Cache-Control": "no-cache", // Force fresh request for some tests
        },
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        success: true,
        responseTime,
        dataSize: JSON.stringify(response.data).length,
        data: response.data,
        cached: response.headers["x-cache-status"] === "HIT",
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Clear cache by making a request with cache-busting
   */
  async clearCache() {
    try {
      await axios.get(`${CONFIG.baseURL}/students`, {
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
   * Validate response structure
   */
  validateResponse(data) {
    const issues = [];

    if (!data) {
      issues.push("No response data");
      return issues;
    }

    // Check required fields
    if (!Array.isArray(data.students)) {
      issues.push("Missing or invalid students array");
    }

    if (typeof data.count !== "number") {
      issues.push("Missing or invalid count field");
    }

    if (!data.optimized) {
      issues.push("Response not marked as optimized");
    }

    if (!data.metadata) {
      issues.push("Missing metadata object");
    } else {
      // Check metadata fields
      const requiredMetadata = [
        "totalStudents",
        "verifiedStudents",
        "activeSubscriptions",
        "averageProgress",
      ];
      requiredMetadata.forEach((field) => {
        if (typeof data.metadata[field] === "undefined") {
          issues.push(`Missing metadata.${field}`);
        }
      });
    }

    // Validate student data structure
    if (data.students && data.students.length > 0) {
      const firstStudent = data.students[0];
      const requiredFields = [
        "user_id",
        "name",
        "email",
        "created_at",
        "is_verified",
        "total_enrollments",
        "avg_progress",
        "completed_courses",
        "total_xp",
        "exercises_completed",
      ];

      requiredFields.forEach((field) => {
        if (typeof firstStudent[field] === "undefined") {
          issues.push(`Missing student field: ${field}`);
        }
      });
    }

    return issues;
  }

  /**
   * Run performance tests
   */
  async runTests() {
    console.log("\n📊 Starting Students List Endpoint Performance Tests");
    console.log("=".repeat(60));

    // Test 1: Cold cache performance (first request)
    console.log("\n🧊 Testing cold cache performance...");
    await this.clearCache();

    for (let i = 0; i < CONFIG.testRuns; i++) {
      const result = await this.makeRequest();

      if (result.success) {
        this.results.firstRequest.push(result.responseTime);
        this.results.responseSizes.push(result.dataSize);

        // Validate response on first successful request
        if (i === 0) {
          const validationIssues = this.validateResponse(result.data);
          if (validationIssues.length > 0) {
            console.warn("⚠️  Response validation issues:", validationIssues);
          } else {
            console.log("✅ Response structure validation passed");
          }

          // Store metadata for reporting
          this.results.metadata = result.data.metadata || {};
        }

        console.log(`   Run ${i + 1}: ${result.responseTime.toFixed(2)}ms`);
      } else {
        console.error(`   Run ${i + 1}: Failed - ${result.error}`);
      }

      // Clear cache between runs to ensure fresh requests
      await this.clearCache();
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
    }

    // Test 2: Warm cache performance (subsequent requests)
    console.log("\n🔥 Testing warm cache performance...");

    // Make one request to warm the cache
    await this.makeRequest();

    for (let i = 0; i < CONFIG.testRuns; i++) {
      const result = await this.makeRequest();

      if (result.success) {
        this.results.cachedRequests.push(result.responseTime);
        console.log(
          `   Run ${i + 1}: ${result.responseTime.toFixed(2)}ms ${
            result.cached ? "(cached)" : "(fresh)"
          }`
        );
      } else {
        console.error(`   Run ${i + 1}: Failed - ${result.error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay
    }
  }

  /**
   * Calculate statistics
   */
  calculateStats(times) {
    if (times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);

    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((sum, time) => sum + time, 0) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Generate performance report
   */
  generateReport() {
    console.log("\n📈 Performance Test Results");
    console.log("=".repeat(60));

    const coldStats = this.calculateStats(this.results.firstRequest);
    const warmStats = this.calculateStats(this.results.cachedRequests);

    if (coldStats) {
      console.log("\n🧊 Cold Cache Performance (First Request):");
      console.log(`   Average: ${coldStats.avg.toFixed(2)}ms`);
      console.log(`   Median:  ${coldStats.median.toFixed(2)}ms`);
      console.log(`   Min:     ${coldStats.min.toFixed(2)}ms`);
      console.log(`   Max:     ${coldStats.max.toFixed(2)}ms`);
      console.log(`   95th:    ${coldStats.p95.toFixed(2)}ms`);
      console.log(`   99th:    ${coldStats.p99.toFixed(2)}ms`);
    }

    if (warmStats) {
      console.log("\n🔥 Warm Cache Performance (Cached Requests):");
      console.log(`   Average: ${warmStats.avg.toFixed(2)}ms`);
      console.log(`   Median:  ${warmStats.median.toFixed(2)}ms`);
      console.log(`   Min:     ${warmStats.min.toFixed(2)}ms`);
      console.log(`   Max:     ${warmStats.max.toFixed(2)}ms`);
      console.log(`   95th:    ${warmStats.p95.toFixed(2)}ms`);
      console.log(`   99th:    ${warmStats.p99.toFixed(2)}ms`);
    }

    // Performance improvement calculation
    if (coldStats && warmStats) {
      const improvement =
        ((coldStats.avg - warmStats.avg) / coldStats.avg) * 100;
      console.log(
        `\n⚡ Cache Performance Improvement: ${improvement.toFixed(1)}%`
      );
    }

    // Response size info
    if (this.results.responseSizes.length > 0) {
      const avgSize =
        this.results.responseSizes.reduce((sum, size) => sum + size, 0) /
        this.results.responseSizes.length;
      console.log(
        `\n📦 Average Response Size: ${(avgSize / 1024).toFixed(2)} KB`
      );
    }

    // Metadata info
    if (this.results.metadata) {
      console.log("\n📊 Response Metadata:");
      console.log(
        `   Total Students: ${this.results.metadata.totalStudents || "N/A"}`
      );
      console.log(
        `   Verified Students: ${
          this.results.metadata.verifiedStudents || "N/A"
        }`
      );
      console.log(
        `   Active Subscriptions: ${
          this.results.metadata.activeSubscriptions || "N/A"
        }`
      );
      console.log(
        `   Average Progress: ${
          this.results.metadata.averageProgress || "N/A"
        }%`
      );
    }

    // Performance target validation
    console.log("\n🎯 Performance Target Validation:");
    if (coldStats) {
      const target = 500; // 500ms target for first request
      const passes = coldStats.avg <= target;
      console.log(
        `   Cold Cache Target (≤${target}ms): ${
          passes ? "✅" : "❌"
        } ${coldStats.avg.toFixed(2)}ms`
      );
    }

    if (warmStats) {
      const target = 100; // 100ms target for cached requests
      const passes = warmStats.avg <= target;
      console.log(
        `   Warm Cache Target (≤${target}ms): ${
          passes ? "✅" : "❌"
        } ${warmStats.avg.toFixed(2)}ms`
      );
    }
  }

  /**
   * Save results to file
   */
  saveResults() {
    const reportData = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      results: this.results,
      coldStats: this.calculateStats(this.results.firstRequest),
      warmStats: this.calculateStats(this.results.cachedRequests),
    };

    const filename = `students-list-performance-${Date.now()}.json`;
    const filepath = `./performance-reports/${filename}`;

    // Create directory if it doesn't exist
    if (!fs.existsSync("./performance-reports")) {
      fs.mkdirSync("./performance-reports");
    }

    fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  const tester = new StudentsListPerformanceTester();

  try {
    // Authenticate
    const authenticated = await tester.authenticate();
    if (!authenticated) {
      process.exit(1);
    }

    // Run tests
    await tester.runTests();

    // Generate and display report
    tester.generateReport();

    // Save results
    tester.saveResults();

    console.log("\n✅ Performance testing completed successfully!");
  } catch (error) {
    console.error("\n❌ Performance testing failed:", error.message);
    process.exit(1);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = StudentsListPerformanceTester;
