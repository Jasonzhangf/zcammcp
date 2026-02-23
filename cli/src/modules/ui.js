const { Command } = require('commander');
const uiWindow = require('./ui-window.js');
const uiControl = require('./ui-control.js');

/**
 * UI 模块入口
 * 统一暴露 ui window / control 子命令
 */

function buildCommand() {
  const cmd = new Command('ui');
  cmd.description('Desktop UI window control and command operations');
  cmd.addCommand(uiWindow);
  cmd.addCommand(uiControl);
  return cmd;
}

module.exports = buildCommand();
