#!/usr/bin/env node

/**
 * ZCAM CLI 测试运行器
 * 提供自动化测试执行、结果跟踪和报告生成功能
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        coverage: 0
      },
      modules: [],
      failed: []
    };
  }

  /**
   * 运行完整测试套件
   */
  async runFullTestSuite() {
    console.log('🚀 开始执行ZCAM CLI完整测试套件...\n');

    try {
      // 1. 运行所有测试并捕获输出
      const output = this.executeTests();

      // 2. 解析测试结果
      this.parseTestResults(output);

      // 3. 生成测试报告
      this.generateReport();

      // 4. 更新跟踪文件
      this.updateTrackingFile();

      console.log('\n✅ 测试套件执行完成!');
      this.displaySummary();

    } catch (error) {
      console.error('❌ 测试执行失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 执行测试命令并捕获输出
   */
  executeTests() {
    try {
      const output = execSync('npm test -- --verbose --json', {
        encoding: 'utf8',
        cwd: process.cwd()
      });
      return output;
    } catch (error) {
      // Jest在测试失败时返回非0退出码，但仍有输出
      return error.stdout || error.message;
    }
  }

  /**
   * 解析Jest测试结果
   */
  parseTestResults(output) {
    // 简化的结果解析 - 实际项目中可能需要更复杂的JSON解析
    const lines = output.split('\n');
    let currentModule = null;

    for (const line of lines) {
      // 检测测试文件
      if (line.includes('.test.js')) {
        currentModule = this.extractModuleName(line);
        this.results.modules.push({
          name: currentModule,
          file: line,
          tests: [],
          passed: 0,
          failed: 0
        });
      }

      // 检测测试结果
      if (line.includes('✓') || line.includes('✗')) {
        this.processTestResult(line, currentModule);
      }
    }

    this.calculateSummary();
  }

  /**
   * 提取模块名称
   */
  extractModuleName(filePath) {
    const parts = filePath.split('/');
    return parts[parts.length - 1].replace('.test.js', '');
  }

  /**
   * 处理单个测试结果
   */
  processTestResult(line, moduleName) {
    if (!moduleName) return;

    const module = this.results.modules.find(m => m.name === moduleName);
    if (!module) return;

    const passed = line.includes('✓');
    const testName = this.extractTestName(line);

    module.tests.push({
      name: testName,
      passed: passed,
      status: passed ? 'passed' : 'failed'
    });

    if (passed) {
      module.passed++;
      this.results.passed++;
    } else {
      module.failed++;
      this.results.failed++;
      this.results.failed.push({
        module: moduleName,
        test: testName,
        line: line
      });
    }

    this.results.total++;
  }

  /**
   * 提取测试名称
   */
  extractTestName(line) {
    // 简单的名称提取逻辑
    const match = line.match(/[✓✗]\s*(.+)/);
    return match ? match[1].trim() : 'Unknown Test';
  }

  /**
   * 计算汇总统计
   */
  calculateSummary() {
    this.results.summary = {
      total: this.results.total,
      passed: this.results.passed,
      failed: this.results.failed,
      coverage: this.results.total > 0 ?
        Math.round((this.results.passed / this.results.total) * 100) : 0
    };
  }

  /**
   * 生成详细测试报告
   */
  generateReport() {
    const reportPath = path.join(process.cwd(), 'test-results', `report-${Date.now()}.json`);

    // 确保目录存在
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 写入报告
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📊 测试报告已生成: ${reportPath}`);
  }

  /**
   * 更新测试跟踪文件
   */
  updateTrackingFile() {
    const trackingFile = path.join(process.cwd(), 'TEST_PLAN_TRACKING.md');

    if (!fs.existsSync(trackingFile)) {
      console.log('⚠️  测试跟踪文件不存在，跳过更新');
      return;
    }

    let content = fs.readFileSync(trackingFile, 'utf8');

    // 更新测试统计部分
    const statsSection = this.generateStatsSection();
    const regex = /### 当前测试状态 \(更新时间: .+\)\n[\s\S]*?\n\*\*总体统计\*[:\s\d\%\s]+/g;

    content = content.replace(regex, statsSection);

    fs.writeFileSync(trackingFile, content);
    console.log('📝 测试跟踪文件已更新');
  }

  /**
   * 生成统计部分内容
   */
  generateStatsSection() {
    const moduleStats = this.results.modules.map(module => {
      const total = module.passed + module.failed;
      const passRate = total > 0 ? Math.round((module.passed / total) * 100) : 0;
      const status = passRate === 100 ? '✅ 全部通过' :
                     passRate >= 80 ? '🟡 大部分通过' : '🔴 大部分失败';

      return `| ${module.name} | ${module.file} | ${total} | ${module.passed} | ${module.failed} | ${passRate}% | ${status} |`;
    }).join('\n');

    return `### 当前测试状态 (更新时间: ${new Date().toLocaleString('zh-CN')})
| 模块 | 测试文件 | 总数 | 通过 | 失败 | 覆盖率 | 状态 |
|------|----------|------|------|------|--------|------|
${moduleStats}

**总体统计**: ${this.results.total}个测试，${this.results.passed}个通过，${this.results.failed}个失败，总体通过率${this.results.summary.coverage}%`;
  }

  /**
   * 显示执行摘要
   */
  displaySummary() {
    console.log('\n📊 测试执行摘要:');
    console.log(`   总测试数: ${this.results.total}`);
    console.log(`   通过: ${this.results.passed} (${Math.round((this.results.passed / this.results.total) * 100)}%)`);
    console.log(`   失败: ${this.results.failed} (${Math.round((this.results.failed / this.results.total) * 100)}%)`);

    if (this.results.failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.failed.forEach(failure => {
        console.log(`   - ${failure.module}: ${failure.test}`);
      });
    }

    console.log('\n📋 模块详情:');
    this.results.modules.forEach(module => {
      const status = module.failed === 0 ? '✅' :
                     module.failed <= 2 ? '🟡' : '🔴';
      console.log(`   ${status} ${module.name}: ${module.passed}/${module.passed + module.failed} 通过`);
    });
  }

  /**
   * 运行特定模块测试
   */
  async runModuleTest(moduleName) {
    console.log(`🎯 运行 ${moduleName} 模块测试...\n`);

    try {
      const testFile = `tests/unit/modules/${moduleName}/service.test.js`;
      execSync(`npm test -- ${testFile}`, { stdio: 'inherit' });
      console.log(`\n✅ ${moduleName} 模块测试完成`);
    } catch (error) {
      console.error(`\n❌ ${moduleName} 模块测试失败`);
      process.exit(1);
    }
  }

  /**
   * 生成覆盖率报告
   */
  generateCoverageReport() {
    console.log('📊 生成测试覆盖率报告...\n');

    try {
      execSync('npm test -- --coverage', { stdio: 'inherit' });
      console.log('\n✅ 覆盖率报告已生成到 coverage/ 目录');
    } catch (error) {
      console.error('\n❌ 覆盖率报告生成失败');
      process.exit(1);
    }
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
ZCAM CLI 测试运行器

用法:
  node test-runner.js                    # 运行完整测试套件
  node test-runner.js <module>           # 运行特定模块测试
  node test-runner.js --coverage         # 生成覆盖率报告
  node test-runner.js --help             # 显示帮助信息

示例:
  node test-runner.js                    # 运行所有测试
  node test-runner.js camera             # 只运行camera模块测试
  node test-runner.js --coverage         # 生成覆盖率报告
`);
    process.exit(0);
  }

  if (args.includes('--coverage')) {
    await runner.generateCoverageReport();
    process.exit(0);
  }

  const moduleName = args.find(arg => !arg.startsWith('--'));
  if (moduleName) {
    await runner.runModuleTest(moduleName);
  } else {
    await runner.runFullTestSuite();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestRunner;