/**
 * 收藏管理服务类
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const favoritesSchema = require('../schemas/favorites');

class FavoritesManager {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.favoritesFile = path.join(this.dataDir, 'favorites.json');
    this.favorites = null;
    this.setupAjv();
  }

  /**
   * 设置AJV验证器
   */
  setupAjv() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      removeAdditional: true
    });
    addFormats(this.ajv);
    this.favoritesValidator = this.ajv.compile(favoritesSchema);
  }

  /**
   * 验证favorites数据
   */
  validateFavorites(data) {
    const isValid = this.favoritesValidator(data);
    if (!isValid) {
      console.error('Favorites验证失败:', this.favoritesValidator.errors);
    }
    return isValid;
  }

  /**
   * 初始化收藏管理器
   */
  async initialize() {
    await this.ensureDataDirectory();
    await this.loadFavorites();
  }

  /**
   * 确保数据目录存在
   */
  async ensureDataDirectory() {
    try {
      await fs.access(this.dataDir);
    } catch (error) {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  /**
   * 加载收藏配置
   */
  async loadFavorites() {
    try {
      const data = await fs.readFile(this.favoritesFile, 'utf8');
      this.favorites = JSON.parse(data);

      // 验证数据格式
      if (!this.validateFavorites(this.favorites)) {
        console.warn('收藏配置格式不正确，使用默认配置');
        this.favorites = this.getDefaultFavorites();
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.favorites = this.getDefaultFavorites();
        await this.saveFavorites();
      } else {
        throw new Error(`加载收藏配置失败: ${error.message}`);
      }
    }
  }

  /**
   * 获取默认收藏配置
   */
  getDefaultFavorites() {
    return {
      cameras: {},
      presets: {}
    };
  }

  /**
   * 保存收藏配置
   */
  async saveFavorites() {
    try {
      // 验证数据格式
      if (!this.validateFavorites(this.favorites)) {
        throw new Error('收藏配置格式验证失败');
      }

      await fs.writeFile(this.favoritesFile, JSON.stringify(this.favorites, null, 2));
    } catch (error) {
      throw new Error(`保存收藏配置失败: ${error.message}`);
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * 添加收藏相机
   */
  async addCamera(cameraData) {
    const cameraId = this.generateId();
    const camera = {
      name: cameraData.name,
      ip: cameraData.ip || cameraData.host,
      host: cameraData.host,
      port: cameraData.port || 80,
      username: cameraData.username || '',
      password: cameraData.password || '',
      description: cameraData.description || '',
      tags: cameraData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_default: Object.keys(this.favorites.cameras).length === 0,
      last_connected: null, // 将由schema验证器转换为字符串
      connection_status: 'unknown'
    };

    // 验证相机数据
    const tempFavorites = { ...this.favorites };
    tempFavorites.cameras[cameraId] = camera;

    if (!this.validateFavorites(tempFavorites)) {
      throw new Error('相机数据格式不正确');
    }

    this.favorites.cameras[cameraId] = camera;
    await this.saveFavorites();

    return { id: cameraId, camera };
  }

  /**
   * 更新收藏相机
   */
  async updateCamera(cameraId, updateData) {
    if (!this.favorites.cameras[cameraId]) {
      throw new Error('相机不存在');
    }

    const camera = { ...this.favorites.cameras[cameraId] };

    // 更新允许修改的字段
    const allowedFields = ['name', 'host', 'port', 'username', 'password', 'description', 'tags'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        camera[field] = updateData[field];
      }
    });

    camera.updated_at = new Date().toISOString();

    // 验证更新后的数据
    const tempFavorites = { ...this.favorites };
    tempFavorites.cameras[cameraId] = camera;

    if (!this.validateFavorites(tempFavorites)) {
      throw new Error('更新后的相机数据格式不正确');
    }

    this.favorites.cameras[cameraId] = camera;
    await this.saveFavorites();

    return camera;
  }

  /**
   * 删除收藏相机
   */
  async removeCamera(cameraId) {
    if (!this.favorites.cameras[cameraId]) {
      throw new Error('相机不存在');
    }

    const wasDefault = this.favorites.cameras[cameraId].is_default;
    delete this.favorites.cameras[cameraId];

    // 如果删除的是默认相机，设置第一个为默认
    if (wasDefault && Object.keys(this.favorites.cameras).length > 0) {
      const firstCameraId = Object.keys(this.favorites.cameras)[0];
      this.favorites.cameras[firstCameraId].is_default = true;
    }

    // 同时删除相关的预设
    const presetsToDelete = Object.keys(this.favorites.presets).filter(presetId => {
      return this.favorites.presets[presetId].camera_id === cameraId;
    });

    presetsToDelete.forEach(presetId => {
      delete this.favorites.presets[presetId];
    });

    await this.saveFavorites();
  }

  /**
   * 获取收藏相机列表
   */
  getCameras() {
    return Object.entries(this.favorites.cameras).map(([id, camera]) => ({
      id,
      ...camera
    }));
  }

  /**
   * 获取收藏相机
   */
  getCamera(cameraId) {
    const camera = this.favorites.cameras[cameraId];
    if (!camera) {
      throw new Error('相机不存在');
    }
    return { id: cameraId, ...camera };
  }

  /**
   * 设置默认相机
   */
  async setDefaultCamera(cameraId) {
    if (!this.favorites.cameras[cameraId]) {
      throw new Error('相机不存在');
    }

    // 清除所有默认标记
    Object.values(this.favorites.cameras).forEach(camera => {
      camera.is_default = false;
    });

    // 设置新的默认相机
    this.favorites.cameras[cameraId].is_default = true;
    await this.saveFavorites();
  }

  /**
   * 获取默认相机
   */
  getDefaultCamera() {
    const defaultCamera = Object.entries(this.favorites.cameras).find(([id, camera]) => camera.is_default);
    if (!defaultCamera) {
      return null;
    }
    const [id, camera] = defaultCamera;
    return { id, ...camera };
  }

  /**
   * 更新相机连接状态
   */
  async updateCameraStatus(cameraId, status, lastConnected = null) {
    if (!this.favorites.cameras[cameraId]) {
      throw new Error('相机不存在');
    }

    this.favorites.cameras[cameraId].connection_status = status;
    if (lastConnected) {
      this.favorites.cameras[cameraId].last_connected = lastConnected.toISOString();
    }

    await this.saveFavorites();
  }

  /**
   * 添加收藏预设
   */
  async addPreset(presetData) {
    const presetId = this.generateId();
    const preset = {
      name: presetData.name,
      camera_id: presetData.camera_id,
      preset_index: presetData.preset_index,
      description: presetData.description || '',
      position: presetData.position || {},
      settings: presetData.settings || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: presetData.tags || []
    };

    // 验证预设数据
    const tempFavorites = { ...this.favorites };
    tempFavorites.presets[presetId] = preset;

    if (!this.validateFavorites(tempFavorites)) {
      throw new Error('预设数据格式不正确');
    }

    this.favorites.presets[presetId] = preset;
    await this.saveFavorites();

    return { id: presetId, preset };
  }

  /**
   * 更新收藏预设
   */
  async updatePreset(presetId, updateData) {
    if (!this.favorites.presets[presetId]) {
      throw new Error('预设不存在');
    }

    const preset = { ...this.favorites.presets[presetId] };

    // 更新允许修改的字段
    const allowedFields = ['name', 'description', 'position', 'settings', 'tags'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        preset[field] = updateData[field];
      }
    });

    preset.updated_at = new Date().toISOString();

    // 验证更新后的数据
    const tempFavorites = { ...this.favorites };
    tempFavorites.presets[presetId] = preset;

    if (!this.validateFavorites(tempFavorites)) {
      throw new Error('更新后的预设数据格式不正确');
    }

    this.favorites.presets[presetId] = preset;
    await this.saveFavorites();

    return preset;
  }

  /**
   * 删除收藏预设
   */
  async removePreset(presetId) {
    if (!this.favorites.presets[presetId]) {
      throw new Error('预设不存在');
    }

    delete this.favorites.presets[presetId];
    await this.saveFavorites();
  }

  /**
   * 获取收藏预设列表
   */
  getPresets(cameraId = null) {
    let presets = Object.entries(this.favorites.presets);

    if (cameraId) {
      presets = presets.filter(([id, preset]) => preset.camera_id === cameraId);
    }

    return presets.map(([id, preset]) => ({
      id,
      ...preset
    }));
  }

  /**
   * 获取收藏预设
   */
  getPreset(presetId) {
    const preset = this.favorites.presets[presetId];
    if (!preset) {
      throw new Error('预设不存在');
    }
    return { id: presetId, ...preset };
  }

  /**
   * 导出收藏配置
   */
  async exportFavorites(filePath = null) {
    const exportPath = filePath || `favorites-export-${new Date().toISOString().split('T')[0]}.json`;

    this.favorites.metadata.export_count++;
    await this.saveFavorites();

    await fs.writeFile(exportPath, JSON.stringify(this.favorites, null, 2));
    return exportPath;
  }

  /**
   * 导入收藏配置
   */
  async importFavorites(filePath, merge = false) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const importedFavorites = JSON.parse(data);

      // 验证导入的数据格式
      if (!this.validateFavorites(importedFavorites)) {
        throw new Error('导入的收藏配置格式不正确');
      }

      if (!merge) {
        this.favorites = importedFavorites;
      } else {
        // 合并配置
        this.favorites.cameras = { ...this.favorites.cameras, ...importedFavorites.cameras };
        this.favorites.presets = { ...this.favorites.presets, ...importedFavorites.presets };
      }

      this.favorites.metadata.import_count++;
      await this.saveFavorites();

      return {
        cameras_added: Object.keys(importedFavorites.cameras).length,
        presets_added: Object.keys(importedFavorites.presets).length
      };
    } catch (error) {
      throw new Error(`导入收藏配置失败: ${error.message}`);
    }
  }

  /**
   * 搜索收藏
   */
  searchFavorites(query, type = 'all') {
    const results = {
      cameras: [],
      presets: []
    };

    const searchLower = query.toLowerCase();

    if (type === 'all' || type === 'cameras') {
      results.cameras = this.getCameras().filter(camera => {
        return camera.name.toLowerCase().includes(searchLower) ||
               camera.description.toLowerCase().includes(searchLower) ||
               camera.host.includes(searchLower) ||
               (camera.tags && camera.tags.some(tag => tag.toLowerCase().includes(searchLower)));
      });
    }

    if (type === 'all' || type === 'presets') {
      results.presets = this.getPresets().filter(preset => {
        return preset.name.toLowerCase().includes(searchLower) ||
               preset.description.toLowerCase().includes(searchLower) ||
               (preset.tags && preset.tags.some(tag => tag.toLowerCase().includes(searchLower)));
      });
    }

    return results;
  }
}

module.exports = FavoritesManager;