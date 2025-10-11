// CameraManager测试文件
import { CameraManager } from './CameraManager';
import { ConfigManager } from './ConfigManager';

// 模拟ConfigManager
jest.mock('./ConfigManager');

describe('CameraManager', () => {
  let cameraManager: CameraManager;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    // 创建模拟的ConfigManager实例
    mockConfigManager = new ConfigManager() as jest.Mocked<ConfigManager>;
    
    // 模拟ConfigManager的方法
    mockConfigManager.addCameraToHistory = jest.fn();
    mockConfigManager.getCameraHistory = jest.fn().mockReturnValue([]);
    mockConfigManager.addFavoriteCamera = jest.fn();
    mockConfigManager.removeFavoriteCamera = jest.fn();
    mockConfigManager.getFavoriteCameras = jest.fn().mockReturnValue([]);
    mockConfigManager.addFavoriteCameraWithAlias = jest.fn();
    mockConfigManager.updateFavoriteCameraAlias = jest.fn();
    
    cameraManager = new CameraManager(mockConfigManager);
  });

  afterEach(() => {
    // 清理模拟
    jest.clearAllMocks();
  });

  describe('相机添加功能', () => {
    it('应该能够添加相机并更新上下文', async () => {
      const ip = '192.168.1.100';
      await cameraManager.addCamera(ip);
      
      // 验证相机已添加到上下文
      const context = cameraManager.getCurrentContext();
      expect(context.cameras.has(ip)).toBe(true);
      expect(context.cameras.get(ip)?.ip).toBe(ip);
      
      // 验证调用了历史记录更新
      expect(mockConfigManager.addCameraToHistory).toHaveBeenCalled();
    });

    it('添加第一个相机时应该自动设置为当前相机', async () => {
      const ip = '192.168.1.100';
      await cameraManager.addCamera(ip);
      
      const context = cameraManager.getCurrentContext();
      expect(context.currentCamera).toBe(ip);
    });
  });

  describe('相机状态获取功能', () => {
    it('应该能够获取已添加相机的状态', async () => {
      const ip = '192.168.1.100';
      await cameraManager.addCamera(ip);
      
      const status = await cameraManager.getCameraStatus(ip);
      expect(status).not.toBeNull();
      expect(status?.ip).toBe(ip);
    });

    it('应该返回null当获取不存在相机的状态时', async () => {
      const status = await cameraManager.getCameraStatus('192.168.1.999');
      expect(status).toBeNull();
    });
  });

  describe('相机上下文切换功能', () => {
    it('应该能够切换到已存在的相机', async () => {
      const ip1 = '192.168.1.100';
      const ip2 = '192.168.1.101';
      
      // 添加两个相机
      await cameraManager.addCamera(ip1);
      await cameraManager.addCamera(ip2);
      
      // 切换到第二个相机
      const result = cameraManager.switchCamera(ip2);
      expect(result).toBe(true);
      
      const context = cameraManager.getCurrentContext();
      expect(context.currentCamera).toBe(ip2);
    });

    it('应该无法切换到不存在的相机', async () => {
      const ip = '192.168.1.999';
      const result = cameraManager.switchCamera(ip);
      expect(result).toBe(false);
    });
  });

  describe('相机别名更新功能', () => {
    it('应该能够更新相机别名', async () => {
      const ip = '192.168.1.100';
      const newAlias = 'My Camera';
      
      // 添加相机
      await cameraManager.addCamera(ip);
      
      // 更新别名
      const result = await cameraManager.updateCameraAlias(ip, newAlias);
      expect(result).toBe(true);
      
      // 验证别名已更新
      const status = await cameraManager.getCameraStatus(ip);
      expect(status?.name).toBe(newAlias);
    });

    it('应该无法更新不存在相机的别名', async () => {
      const result = await cameraManager.updateCameraAlias('192.168.1.999', 'New Alias');
      expect(result).toBe(false);
    });
  });

  describe('相机收藏夹功能', () => {
    it('应该能够将相机添加到收藏夹', async () => {
      const ip = '192.168.1.100';
      
      // 添加相机
      await cameraManager.addCamera(ip);
      
      // 添加到收藏夹
      const result = await cameraManager.addToFavorites(ip);
      expect(result).toBe(true);
      
      // 验证调用了ConfigManager的添加方法
      expect(mockConfigManager.addFavoriteCameraWithAlias).toHaveBeenCalledWith(ip, expect.any(String));
    });

    it('应该无法将不存在的相机添加到收藏夹', async () => {
      const result = await cameraManager.addToFavorites('192.168.1.999');
      expect(result).toBe(false);
    });

    it('应该能够从收藏夹移除相机', async () => {
      const ip = '192.168.1.100';
      await cameraManager.removeFromFavorites(ip);
      
      // 验证调用了ConfigManager的移除方法
      expect(mockConfigManager.removeFavoriteCamera).toHaveBeenCalledWith(ip);
    });
  });
});