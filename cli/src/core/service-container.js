/**
 * CLI服务容器
 * 实现依赖注入模式，管理所有CLI服务的生命周期
 * 支持服务实例化和依赖关系管理
 */

const CameraService = require('../modules/camera/service');
const PTZService = require('../modules/control/service');
const StreamingService = require('../modules/stream/service');
const RecordingService = require('../modules/record/service');

class ServiceContainer {
  constructor(apiClient = null) {
    this.apiClient = apiClient;
    this.services = new Map();
    this.serviceConfigs = new Map();
    
    // 注册服务配置
    this.registerServiceConfigs();
  }

  /**
   * 注册服务配置
   */
  registerServiceConfigs() {
    this.serviceConfigs.set('camera', {
      class: CameraService,
      dependencies: ['apiClient', 'constants']
    });
    
    this.serviceConfigs.set('ptz', {
      class: PTZService,
      dependencies: ['apiClient', 'constants']
    });
    
    this.serviceConfigs.set('streaming', {
      class: StreamingService,
      dependencies: ['apiClient', 'constants']
    });
    
    this.serviceConfigs.set('recording', {
      class: RecordingService,
      dependencies: ['apiClient', 'constants']
    });
  }

  /**
   * 获取服务实例
   */
  getService(serviceName) {
    if (!this.services.has(serviceName)) {
      this.createService(serviceName);
    }
    return this.services.get(serviceName);
  }

  /**
   * 创建服务实例
   */
  createService(serviceName) {
    const config = this.serviceConfigs.get(serviceName);
    if (!config) {
      throw new Error(`Service '${serviceName}' not registered in container`);
    }

    // 解析依赖
    const dependencies = {};
    for (const dep of config.dependencies) {
      switch (dep) {
        case 'apiClient':
          dependencies.apiClient = this.apiClient;
          break;
        case 'constants':
          dependencies.constantsModule = require('../constants');
          break;
        default:
          throw new Error(`Unknown dependency: ${dep}`);
      }
    }

    // 创建服务实例
    const serviceInstance = new config.class(dependencies.apiClient, dependencies.constantsModule);
    this.services.set(serviceName, serviceInstance);
    
    return serviceInstance;
  }

  /**
   * 预加载所有服务
   */
  preloadAllServices() {
    for (const serviceName of this.serviceConfigs.keys()) {
      this.getService(serviceName);
    }
  }

  /**
   * 清除所有服务实例（用于测试）
   */
  clearServices() {
    this.services.clear();
  }

  /**
   * 获取所有已注册的服务名称
   */
  getRegisteredServices() {
    return Array.from(this.serviceConfigs.keys());
  }

  /**
   * 检查服务是否已注册
   */
  hasService(serviceName) {
    return this.serviceConfigs.has(serviceName);
  }

  /**
   * 销毁容器和所有服务
   */
  destroy() {
    this.services.clear();
    this.serviceConfigs.clear();
  }
}

// 单例模式的全局服务容器
let globalContainer = null;

function getServiceContainer(apiClient = null) {
  if (!globalContainer || (apiClient && globalContainer.apiClient !== apiClient)) {
    globalContainer = new ServiceContainer(apiClient);
  }
  return globalContainer;
}

function createServiceContainer(apiClient = null) {
  return new ServiceContainer(apiClient);
}

module.exports = {
  ServiceContainer,
  getServiceContainer,
  createServiceContainer
};