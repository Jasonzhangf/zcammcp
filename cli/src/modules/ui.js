const { Command } = require('commander');
const uiWindow = require('./ui-window.js');

/**
 * UI 模块入口
 * 统一暴露 ui window 子命令
 */

function buildCommand() {
  const cmd = new Command('ui');
  cmd.description('Desktop UI window control operations');
  cmd.addCommand(uiWindow);
  return cmd;
}

module.exports = buildCommand();
