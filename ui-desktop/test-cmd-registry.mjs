import { CommandRegistry, getCommandRegistry, resetCommandRegistry } from './dist/src/app/framework/commands/CommandRegistry.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✓ ' + name);
    passed++;
  } catch (e) {
    console.log('✗ ' + name + ': ' + e.message);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log('✓ ' + name);
    passed++;
  } catch (e) {
    console.log('✗ ' + name + ': ' + e.message);
    failed++;
  }
}

// Mock store
const mockStore = {
  runOperation: () => {},
  updateUiState: () => {},
  getViewState: () => ({ camera: {}, ui: { layoutMode: 'full', selectedNodes: [], debugMode: 'normal', highlightMap: {} } })
};

const mockContext = {
  store: mockStore,
  view: { camera: {}, ui: { layoutMode: 'full', selectedNodes: [], debugMode: 'normal', highlightMap: {} } },
  params: {}
};

// Test 1: register new command
{
  const reg = new CommandRegistry();
  reg.register({
    id: 'test.cmd',
    category: 'window',
    description: 'Test',
    handler: async () => ({ success: true })
  });
  const cmd = reg.get('test.cmd');
  test('should register a new command', () => {
    if (!cmd) throw new Error('cmd not found');
    if (cmd.id !== 'test.cmd') throw new Error('wrong id');
  });
}

// Test 2: overwrite existing command
{
  const reg = new CommandRegistry();
  reg.register({ id: 'test.cmd', category: 'window', description: 'First', handler: async () => ({ success: true }) });
  reg.register({ id: 'test.cmd', category: 'window', description: 'Second', handler: async () => ({ success: true }) });
  test('should overwrite existing command', () => {
    const cmd = reg.get('test.cmd');
    if (cmd?.description !== 'Second') throw new Error('not overwritten');
  });
}

// Test 3: unknown command
{
  const reg = new CommandRegistry();
  await testAsync('should return error for unknown command', async () => {
    const result = await reg.execute('unknown', mockContext);
    if (result.success !== false) throw new Error('should fail');
    if (!result.error?.includes('not found')) throw new Error('wrong error');
  });
}

// Test 4: missing required param
{
  const reg = new CommandRegistry();
  reg.register({
    id: 'test.req',
    category: 'window',
    description: 'Test',
    parameters: [{ name: 'val', type: 'number', required: true }],
    handler: async () => ({ success: true })
  });
  await testAsync('should return error for missing required param', async () => {
    const result = await reg.execute('test.req', mockContext);
    if (result.success !== false) throw new Error('should fail');
    if (!result.error?.includes('Missing')) throw new Error('wrong error: ' + result.error);
  });
}

// Test 5: wrong type number
{
  const reg = new CommandRegistry();
  reg.register({
    id: 'test.type',
    category: 'window',
    description: 'Test',
    parameters: [{ name: 'val', type: 'number', required: true }],
    handler: async () => ({ success: true })
  });
  await testAsync('should return error for wrong type', async () => {
    const result = await reg.execute('test.type', { ...mockContext, params: { val: 'not-num' } });
    if (result.success !== false) throw new Error('should fail');
    if (!result.error?.includes('Invalid type')) throw new Error('wrong error: ' + result.error);
  });
}

// Test 6: handler throws
{
  const reg = new CommandRegistry();
  reg.register({
    id: 'test.throw',
    category: 'window',
    description: 'Test',
    handler: async () => { throw new Error('boom'); }
  });
  await testAsync('should handle handler throw', async () => {
    const result = await reg.execute('test.throw', mockContext);
    if (result.success !== false) throw new Error('should fail');
    if (!result.error?.includes('boom')) throw new Error('wrong error: ' + result.error);
  });
}

// Test 7: valid execution
{
  const reg = new CommandRegistry();
  reg.register({
    id: 'test.ok',
    category: 'window',
    description: 'Test',
    parameters: [{ name: 'val', type: 'number', required: true }],
    handler: async (ctx) => ({ success: true, data: ctx.params.val })
  });
  await testAsync('should execute successfully with valid params', async () => {
    const result = await reg.execute('test.ok', { ...mockContext, params: { val: 42 } });
    if (result.success !== true) throw new Error('should succeed');
    if (result.data !== 42) throw new Error('wrong data');
  });
}

// Test 8: singleton
{
  resetCommandRegistry();
  const r1 = getCommandRegistry();
  const r2 = getCommandRegistry();
  test('singleton returns same instance', () => {
    if (r1 !== r2) throw new Error('not same instance');
  });
  resetCommandRegistry();
  const r3 = getCommandRegistry();
  test('reset creates new instance', () => {
    if (r1 === r3) throw new Error('should be different');
  });
}

// Test 9: enum validation
{
  const reg = new CommandRegistry();
  reg.register({
    id: 'test.enum',
    category: 'window',
    description: 'Test',
    parameters: [{ name: 'mode', type: 'enum', required: true, options: ['auto', 'manual'] }],
    handler: async () => ({ success: true })
  });
  await testAsync('should reject invalid enum value', async () => {
    const result = await reg.execute('test.enum', { ...mockContext, params: { mode: 'invalid' } });
    if (result.success !== false) throw new Error('should fail');
  });
  await testAsync('should accept valid enum value', async () => {
    const result = await reg.execute('test.enum', { ...mockContext, params: { mode: 'auto' } });
    if (result.success !== true) throw new Error('should succeed');
  });
}

// Test 10: getByCategory
{
  const reg = new CommandRegistry();
  reg.register({ id: 'cmd1', category: 'window', description: 'Cmd 1', handler: async () => ({ success: true }) });
  reg.register({ id: 'cmd2', category: 'window', description: 'Cmd 2', handler: async () => ({ success: true }) });
  reg.register({ id: 'cmd3', category: 'system', description: 'Cmd 3', handler: async () => ({ success: true }) });
  test('getByCategory returns correct commands', () => {
    const windowCmds = reg.getByCategory('window');
    if (windowCmds.length !== 2) throw new Error('expected 2, got ' + windowCmds.length);
    const systemCmds = reg.getByCategory('system');
    if (systemCmds.length !== 1) throw new Error('expected 1');
  });
}

// Test 11: has
{
  const reg = new CommandRegistry();
  reg.register({ id: 'test.exists', category: 'window', description: 'Test', handler: async () => ({ success: true }) });
  test('has returns true for registered command', () => {
    if (!reg.has('test.exists')) throw new Error('should exist');
  });
  test('has returns false for unregistered command', () => {
    if (reg.has('test.not.exists')) throw new Error('should not exist');
  });
}

console.log('');
console.log('Tests: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
