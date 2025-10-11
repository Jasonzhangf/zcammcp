// ConfigManager测试文件
import { ConfigManager } from './ConfigManager';
import * as fs from 'fs';
import * as path from 'path';

// 模拟文件系统操作
jest.mock('fs');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockConfigPath: string;

  beforeEach(() => {
    // 创建临时配置文件路径
    mockConfigPath = path.join(__dirname, 'test-config.json');
    
    // 模拟fs.existsSync始终返回false，以确保我们测试创建新配置的情况
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // 模拟fs.writeFileSync
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    // 模拟fs.readFileSync返回空配置
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      version: '0.0.1',
      cameras: {
        favorites: [],
        history: []
      }
    }));
    
    configManager = new ConfigManager(mockConfigPath);
  });

  afterEach(() => {
    // 清理模拟
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该创建ConfigManager实例', () => {
      expect(configManager).toBeInstanceOf(ConfigManager);
    });

    it('应该创建默认配置文件', () => {
      // 检查是否调用了写入文件的方法
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // 检查配置是否正确初始化
      const favorites = configManager.getFavoriteCameras();
      const history = configManager.getCameraHistory();
      
      expect(favorites).toEqual([]);
      expect(history).toEqual([]);
    });
  });

  describe('收藏相机功能', () => {
    it('应该能够添加相机到收藏列表', () => {
      // 模拟fs.existsSync返回true，表示配置目录存在
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      configManager.addFavoriteCamera('192.168.1.100');
      const favorites = configManager.getFavoriteCameras();
      expect(favorites).toContain('192.168.1.100');
    });

    it('应该避免重复添加相机到收藏列表', () => {
      // 模拟fs.existsSync返回true，表示配置目录存在
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      configManager.addFavoriteCamera('192.168.1.100');
      configManager.addFavoriteCamera('192.168.1.100');
      const favorites = configManager.getFavoriteCameras();
      expect(favorites).toEqual(['192.168.1.100']);
    });

    it('应该能够从收藏列表移除相机', () => {
      // 模拟fs.existsSync返回true，表示配置目录存在
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      configManager.addFavoriteCamera('192.168.1.100');
      configManager.removeFavoriteCamera('192.168.1.100');
      const favorites = configManager.getFavoriteCameras();
      expect(favorites).not.toContain('192.168.1.100');
    });
  });

  describe('相机历史记录功能', () => {
    const testCamera = {
      ip: '192.168.1.101',
      name: 'Test Camera',
      model: 'Z CAM E2',
      firmware: '1.0.0',
      mac: '00:11:22:33:44:55',
      serialNumber: '123456789',
      addedAt: new Date()
    };

    it('应该能够添加相机到历史记录', () => {
      // 模拟fs.existsSync返回true，表示配置目录存在
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      configManager.addCameraToHistory(testCamera);
      const history = configManager.getCameraHistory();
      expect(history).toHaveLength(1);
      expect(history[0].ip).toBe(testCamera.ip);
      expect(history[0].name).toBe(testCamera.name);
    });

    it('应该能够更新已存在的相机历史记录', () => {
      // 模拟fs.existsSync返回true，表示配置目录存在
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // 添加相机
      configManager.addCameraToHistory(testCamera);
      
      // 更新相机信息
      const updatedCamera = { ...testCamera, name: 'Updated Camera' };
      configManager.addCameraToHistory(updatedCamera);
      
      const history = configManager.getCameraHistory();
      expect(history).toHaveLength(1);
      expect(history[0].name).toBe('Updated Camera');
    });

    it('应该能够从历史记录移除相机', () => {
      // 模拟fs.existsSync返回true，表示配置目录存在
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      configManager.addCameraToHistory(testCamera);
      configManager.removeCameraFromHistory(testCamera.ip);
      const history = configManager.getCameraHistory();
      expect(history).toHaveLength(0);
    });

    it('应该能够清空相机历史记录', () => {
      // 模拟fs.existsSync返回true，表示配置目录存在
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      configManager.addCameraToHistory(testCamera);
      configManager.clearCameraHistory();
      const history = configManager.getCameraHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('配置文件操作', () => {
    it('应该能够保存和加载配置', () => {
      // 模拟fs.existsSync返回true，表示配置目录存在
      (fs.existsSync as jest.Mock)
        .mockImplementation((filePath) => {
          if (filePath === mockConfigPath) {
            return true; // 配置文件存在
          }
          return true; // 目录存在
        });
      
      // 模拟fs.readFileSync根据不同路径返回不同内容
      (fs.readFileSync as jest.Mock)
        .mockImplementation((filePath) => {
          if (filePath === mockConfigPath) {
            // 返回包含测试数据的配置
            return JSON.stringify({
              version: '0.0.1',
              cameras: {
                favorites: ['192.168.1.100'],
                history: [{
                  ip: '192.168.1.101',
                  name: 'Test Camera',
                  model: 'Z CAM E2',
                  firmware: '1.0.0',
                  mac: '00:11:22:33:44:55',
                  serialNumber: '123456789',
                  addedAt: new Date().toISOString()
                }]
              }
            });
          }
          return '{}';
        });
      
      // 创建新的ConfigManager实例来模拟重新启动
      const newConfigManager = new ConfigManager(mockConfigPath);
      
      // 验证数据是否正确加载
      const favorites = newConfigManager.getFavoriteCameras();
      const history = newConfigManager.getCameraHistory();
      
      expect(favorites).toContain('192.168.1.100');
      expect(history).toHaveLength(1);
      expect(history[0].ip).toBe('192.168.1.101');
    });
  });
});