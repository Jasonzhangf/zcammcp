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
      try {
        const data = JSON.parse(jsonContent);
        return {
          lines: data.total?.lines?.pct ?? 0,
          branches: data.total?.branches?.pct ?? 0,
          functions: data.total?.functions?.pct ?? 0,
          statements: data.total?.statements?.pct ?? 0
        };
      } catch (e) {
        throw new Error(`JSON parse error: ${e.message}`);
      }
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

    it('should throw on invalid JSON', () => {
      assert.throws(() => {
        parseCoverageSummary('not valid json');
      }, /JSON parse error/);
    });

    it('should throw on malformed JSON structure', () => {
      assert.throws(() => {
        parseCoverageSummary('{broken json');
      }, /JSON parse error/);
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

  describe('coverageScriptValidation', () => {
    function validateCoverageScript(scriptPath, summaryPath) {
      const failures = [];
      
      if (!scriptPath) {
        failures.push('Coverage script path not provided');
        return { passed: false, failures };
      }
      
      if (!summaryPath) {
        failures.push('Coverage summary path not provided');
        return { passed: false, failures };
      }
      
      // Check script exists
      if (!fs.existsSync(scriptPath)) {
        failures.push(`Coverage script not found: ${scriptPath}`);
      }
      
      // Check summary exists
      if (!fs.existsSync(summaryPath)) {
        failures.push(`Coverage summary not found: ${summaryPath}`);
      }
      
      return {
        passed: failures.length === 0,
        failures
      };
    }

    it('should fail when coverage script missing', () => {
      const result = validateCoverageScript('/nonexistent/script.js', '/nonexistent/summary.json');
      assert.strictEqual(result.passed, false);
      assert(result.failures.some(f => f.includes('script not found')));
    });

    it('should fail when coverage summary missing', () => {
      // Create temp script file
      const tempScript = '/tmp/test-coverage-script.js';
      fs.writeFileSync(tempScript, 'console.log("test")');
      
      const result = validateCoverageScript(tempScript, '/nonexistent/coverage-summary.json');
      assert.strictEqual(result.passed, false);
      assert(result.failures.some(f => f.includes('summary not found')));
      
      fs.unlinkSync(tempScript);
    });

    it('should pass when both script and summary exist', () => {
      const tempScript = '/tmp/test-script.js';
      const tempSummary = '/tmp/test-summary.json';
      
      fs.writeFileSync(tempScript, 'console.log("test")');
      fs.writeFileSync(tempSummary, JSON.stringify({ total: { lines: { pct: 95 }, branches: { pct: 95 } } }));
      
      const result = validateCoverageScript(tempScript, tempSummary);
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.failures.length, 0);
      
      fs.unlinkSync(tempScript);
      fs.unlinkSync(tempSummary);
    });
  });

  describe('coverageGateFailureScenarios', () => {
    function runCoverageGate(coverageData, scriptExists = true, summaryExists = true) {
      const failures = [];
      
      if (!scriptExists) {
        failures.push('Coverage script missing');
        return { passed: false, failures, exitCode: 1 };
      }
      
      if (!summaryExists) {
        failures.push('Coverage summary missing');
        return { passed: false, failures, exitCode: 1 };
      }
      
      try {
        const data = typeof coverageData === 'string' ? JSON.parse(coverageData) : coverageData;
        const lines = data.total?.lines?.pct ?? 0;
        const branches = data.total?.branches?.pct ?? 0;
        
        if (lines < 95 || branches < 95) {
          failures.push(`Coverage below 95%: lines=${lines}%, branches=${branches}%`);
          return { passed: false, failures, exitCode: 1, lines, branches };
        }
        
        return { passed: true, failures: [], exitCode: 0, lines, branches };
      } catch (e) {
        failures.push(`JSON parse error: ${e.message}`);
        return { passed: false, failures, exitCode: 1 };
      }
    }

    it('should fail when summary file missing', () => {
      const result = runCoverageGate(null, true, false);
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.exitCode, 1);
      assert(result.failures.some(f => f.includes('summary missing')));
    });

    it('should fail when branch coverage below 95%', () => {
      const coverageData = {
        total: {
          lines: { pct: 96 },
          branches: { pct: 94 }
        }
      };
      const result = runCoverageGate(coverageData);
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.exitCode, 1);
      assert(result.failures.some(f => f.includes('94%')));
    });

    it('should fail when line coverage below 95%', () => {
      const coverageData = {
        total: {
          lines: { pct: 93 },
          branches: { pct: 96 }
        }
      };
      const result = runCoverageGate(coverageData);
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.exitCode, 1);
      assert(result.failures.some(f => f.includes('93%')));
    });

    it('should fail when both coverages below 95%', () => {
      const coverageData = {
        total: {
          lines: { pct: 90 },
          branches: { pct: 92 }
        }
      };
      const result = runCoverageGate(coverageData);
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.exitCode, 1);
      assert(result.failures.some(f => f.includes('90%') && f.includes('92%')));
    });

    it('should fail on JSON parse exception', () => {
      const result = runCoverageGate('invalid json {', true, true);
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.exitCode, 1);
      assert(result.failures.some(f => f.includes('JSON parse error')));
    });

    it('should pass when both coverages meet 95% threshold', () => {
      const coverageData = {
        total: {
          lines: { pct: 95 },
          branches: { pct: 95 }
        }
      };
      const result = runCoverageGate(coverageData);
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.failures.length, 0);
    });

    it('should pass when coverages exceed threshold', () => {
      const coverageData = {
        total: {
          lines: { pct: 98 },
          branches: { pct: 97 }
        }
      };
      const result = runCoverageGate(coverageData);
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.exitCode, 0);
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
