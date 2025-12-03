/**
 * Jest测试环境设置
 */

// 设置测试环境
process.env.NODE_ENV = 'test';

// 增加测试超时时间
jest.setTimeout(30000);

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

// 清理定时器
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
