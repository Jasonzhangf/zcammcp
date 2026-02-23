/**
 * Coverage Gate Tests
 * 测试覆盖率门禁解析和阈值判断逻辑
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Coverage Gate', () => {
  describe('parseCoverageSummary', () => {
    // 模拟覆盖率摘要解析
    function parseCoverageSummary(jsonContent) {
      const data = JSON.parse(jsonContent);
      return {
        lines: data.total?.lines?.pct ?? 0,
        branches: data.total?.branches?.pct ?? 0,
        functions: data.total?.functions?.pct ?? 0,
        statements: data.total?.statements?.pct ?? 0
      };
    }

    it('should parse valid coverage summary', () => {
      const summary = JSON.stringify({
        total: {
          lines: { total: 100, covered: 95, skipped: 0, pct: 95 },
          branches: { total: 50, covered: 47, skipped: 0, pct: 94 },
          functions: { total: 20, covered: 18, skipped: 0, pct: 90 },
          statements: { total: 150, covered: 140, skipped: 0, pct: 93.33 }
        }
      });

      const result = parseCoverageSummary(summary);
      assert.strictEqual(result.lines, 95);
      assert.strictEqual(result.branches, 94);
      assert.strictEqual(result.functions, 90);
      assert.strictEqual(result.statements, 93.33);
    });

    it('should handle missing coverage data', () => {
      const summary = JSON.stringify({});
      const result = parseCoverageSummary(summary);
      assert.strictEqual(result.lines, 0);
      assert.strictEqual(result.branches, 0);
    });
  });

  describe('checkCoverageThreshold', () => {
    const THRESHOLD = 95;

    function checkCoverageThreshold(coverage, threshold = THRESHOLD) {
      const passed = coverage.lines >= threshold && coverage.branches >= threshold;
      return {
        passed,
        lineCoverage: coverage.lines,
        branchCoverage: coverage.branches,
        threshold,
        failures: passed ? [] : [
          ...(coverage.lines < threshold ? [`Line coverage ${coverage.lines}% < ${threshold}%`] : []),
          ...(coverage.branches < threshold ? [`Branch coverage ${coverage.branches}% < ${threshold}%`] : [])
        ]
      };
    }

    it('should pass when coverage meets threshold', () => {
      const result = checkCoverageThreshold({ lines: 95, branches: 95 });
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.failures.length, 0);
    });

    it('should pass when coverage exceeds threshold', () => {
      const result = checkCoverageThreshold({ lines: 97, branches: 96 });
      assert.strictEqual(result.passed, true);
    });

    it('should fail when line coverage below threshold', () => {
      const result = checkCoverageThreshold({ lines: 94, branches: 95 });
      assert.strictEqual(result.passed, false);
      assert(result.failures.some(f => f.includes('Line coverage')));
    });

    it('should fail when branch coverage below threshold', () => {
      const result = checkCoverageThreshold({ lines: 95, branches: 94 });
      assert.strictEqual(result.passed, false);
      assert(result.failures.some(f => f.includes('Branch coverage')));
    });

    it('should fail when both coverages below threshold', () => {
      const result = checkCoverageThreshold({ lines: 90, branches: 92 });
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.failures.length, 2);
    });

    it('should support custom threshold', () => {
      const result = checkCoverageThreshold({ lines: 85, branches: 85 }, 80);
      assert.strictEqual(result.passed, true);
    });

    it('should handle edge case at exact threshold', () => {
      const result = checkCoverageThreshold({ lines: 95.0, branches: 95.0 });
      assert.strictEqual(result.passed, true);
    });

    it('should handle decimal coverage values', () => {
      const result = checkCoverageThreshold({ lines: 94.99, branches: 95.01 });
      assert.strictEqual(result.passed, false);
      assert(result.failures.some(f => f.includes('94.99%')));
    });
  });

  describe('generateGateReport', () => {
    function generateGateReport(results) {
      const allPassed = results.every(r => r.passed);
      const failures = results.flatMap(r => r.failures || []);
      
      return {
        passed: allPassed,
        timestamp: new Date().toISOString(),
        summary: allPassed ? 'All coverage gates passed' : `${failures.length} coverage gate(s) failed`,
        failures,
        results: results.map(r => ({
          name: r.name,
          lineCoverage: r.lineCoverage,
          branchCoverage: r.branchCoverage,
          passed: r.passed
        }))
      };
    }

    it('should generate report for all passed gates', () => {
      const results = [
        { name: 'CLI', lines: 96, branches: 95, passed: true, failures: [] },
        { name: 'UI', lines: 97, branches: 96, passed: true, failures: [] }
      ];
      
      const report = generateGateReport(results);
      assert.strictEqual(report.passed, true);
      assert.strictEqual(report.failures.length, 0);
      assert(report.summary.includes('passed'));
    });

    it('should generate report with failures', () => {
      const results = [
        { name: 'CLI', lines: 94, branches: 95, passed: false, failures: ['Line coverage 94% < 95%'] },
        { name: 'UI', lines: 95, branches: 95, passed: true, failures: [] }
      ];
      
      const report = generateGateReport(results);
      assert.strictEqual(report.passed, false);
      assert.strictEqual(report.failures.length, 1);
      assert(report.summary.includes('failed'));
    });

    it('should include timestamp in report', () => {
      const report = generateGateReport([{ name: 'Test', lines: 95, branches: 95, passed: true, failures: [] }]);
      assert(report.timestamp);
      assert(!isNaN(Date.parse(report.timestamp)));
    });
  });

  describe('exitCodeBehavior', () => {
    it('should return exit code 0 when all gates pass', () => {
      const gates = [
        { passed: true },
        { passed: true }
      ];
      const exitCode = gates.every(g => g.passed) ? 0 : 1;
      assert.strictEqual(exitCode, 0);
    });

    it('should return exit code 1 when any gate fails', () => {
      const gates = [
        { passed: true },
        { passed: false }
      ];
      const exitCode = gates.every(g => g.passed) ? 0 : 1;
      assert.strictEqual(exitCode, 1);
    });

    it('should return exit code 1 when all gates fail', () => {
      const gates = [
        { passed: false },
        { passed: false }
      ];
      const exitCode = gates.every(g => g.passed) ? 0 : 1;
      assert.strictEqual(exitCode, 1);
    });
  });
});
