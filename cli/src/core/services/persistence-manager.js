/**
 * 持久化存储管理器
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class PersistenceManager {
  constructor() {
    this.baseDir = path.join(process.cwd(), 'storage');
    this.cacheDir = path.join(this.baseDir, 'cache');
    this.logsDir = path.join(this.baseDir, 'logs');
    this.tempDir = path.join(this.baseDir, 'temp');
    this.backupsDir = path.join(this.baseDir, 'backups');
    this.compressionEnabled = true;
    this.encryptionKey = null;
  }

  /**
   * 初始化持久化管理器
   */
  async initialize() {
    await this.ensureDirectories();
    await this.cleanupTemp();
  }

  /**
   * 确保所有目录存在
   */
  async ensureDirectories() {
    const directories = [
      this.baseDir,
      this.cacheDir,
      this.logsDir,
      this.tempDir,
      this.backupsDir
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch (error) {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * 清理临时文件
   */
  async cleanupTemp() {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);

        // 删除超过24小时的临时文件
        if (now - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.warn('清理临时文件失败:', error.message);
    }
  }

  /**
   * 设置加密密钥
   */
  setEncryptionKey(key) {
    this.encryptionKey = key;
  }

  /**
   * 加密数据
   */
  async encrypt(data) {
    if (!this.encryptionKey) {
      return data;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 解密数据
   */
  async decrypt(encryptedData) {
    if (!this.encryptionKey) {
      return encryptedData;
    }

    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 压缩数据
   */
  async compress(data) {
    if (!this.compressionEnabled) {
      return data;
    }

    const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
    return await gzip(jsonString);
  }

  /**
   * 解压缩数据
   */
  async decompress(compressedData) {
    if (!this.compressionEnabled) {
      return compressedData;
    }

    const decompressed = await gunzip(compressedData);
    return decompressed.toString();
  }

  /**
   * 保存数据
   */
  async save(key, data, options = {}) {
    const {
      category = 'general',
      encrypt = false,
      compress = this.compressionEnabled,
      ttl = null
    } = options;

    try {
      const categoryDir = path.join(this.cacheDir, category);
      await fs.mkdir(categoryDir, { recursive: true });

      let processedData = data;

      // 序列化数据
      if (typeof processedData !== 'string' && !Buffer.isBuffer(processedData)) {
        processedData = JSON.stringify(processedData);
      }

      // 加密
      if (encrypt && this.encryptionKey) {
        processedData = await this.encrypt(processedData);
      }

      // 压缩
      if (compress) {
        processedData = await this.compress(processedData);
      }

      const filePath = path.join(categoryDir, `${key}.dat`);
      const metaFilePath = path.join(categoryDir, `${key}.meta`);

      // 创建元数据
      const metadata = {
        key,
        category,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        size: processedData.length,
        encrypted: encrypt && !!this.encryptionKey,
        compressed: compress,
        ttl: ttl ? new Date(Date.now() + ttl).toISOString() : null
      };

      // 保存数据和元数据
      await Promise.all([
        fs.writeFile(filePath, processedData),
        fs.writeFile(metaFilePath, JSON.stringify(metadata, null, 2))
      ]);

      return { success: true, key, metadata };
    } catch (error) {
      throw new Error(`保存数据失败: ${error.message}`);
    }
  }

  /**
   * 加载数据
   */
  async load(key, category = 'general') {
    try {
      const filePath = path.join(this.cacheDir, category, `${key}.dat`);
      const metaFilePath = path.join(this.cacheDir, category, `${key}.meta`);

      // 检查文件是否存在
      try {
        await fs.access(filePath);
        await fs.access(metaFilePath);
      } catch (error) {
        throw new Error(`数据不存在: ${key}`);
      }

      // 读取元数据
      const metadata = JSON.parse(await fs.readFile(metaFilePath, 'utf8'));

      // 检查TTL
      if (metadata.ttl && new Date(metadata.ttl) < new Date()) {
        await this.delete(key, category);
        throw new Error(`数据已过期: ${key}`);
      }

      // 读取数据
      let data = await fs.readFile(filePath);

      // 解压缩
      if (metadata.compressed) {
        data = await this.decompress(data);
      }

      // 解密
      if (metadata.encrypted) {
        data = await this.decrypt(data);
      }

      // 尝试解析JSON
      try {
        data = JSON.parse(data);
      } catch (error) {
        // 保持原始字符串
      }

      return { data, metadata };
    } catch (error) {
      throw new Error(`加载数据失败: ${error.message}`);
    }
  }

  /**
   * 删除数据
   */
  async delete(key, category = 'general') {
    try {
      const filePath = path.join(this.cacheDir, category, `${key}.dat`);
      const metaFilePath = path.join(this.cacheDir, category, `${key}.meta`);

      await Promise.all([
        fs.unlink(filePath).catch(() => {}), // 忽略文件不存在的错误
        fs.unlink(metaFilePath).catch(() => {})
      ]);

      return { success: true, key };
    } catch (error) {
      throw new Error(`删除数据失败: ${error.message}`);
    }
  }

  /**
   * 检查数据是否存在
   */
  async exists(key, category = 'general') {
    try {
      const filePath = path.join(this.cacheDir, category, `${key}.dat`);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取数据元数据
   */
  async getMetadata(key, category = 'general') {
    try {
      const metaFilePath = path.join(this.cacheDir, category, `${key}.meta`);
      const metadata = JSON.parse(await fs.readFile(metaFilePath, 'utf8'));

      // 检查TTL
      if (metadata.ttl && new Date(metadata.ttl) < new Date()) {
        await this.delete(key, category);
        throw new Error(`数据已过期: ${key}`);
      }

      return metadata;
    } catch (error) {
      throw new Error(`获取元数据失败: ${error.message}`);
    }
  }

  /**
   * 列出分类下的所有数据
   */
  async list(category = 'general') {
    try {
      const categoryDir = path.join(this.cacheDir, category);
      const files = await fs.readdir(categoryDir);

      const metaFiles = files.filter(file => file.endsWith('.meta'));
      const keys = [];

      for (const metaFile of metaFiles) {
        const key = metaFile.replace('.meta', '');
        try {
          const metadata = await this.getMetadata(key, category);
          keys.push({ key, metadata });
        } catch (error) {
          // 忽略过期或损坏的数据
        }
      }

      return keys.sort((a, b) => new Date(b.metadata.modified) - new Date(a.metadata.modified));
    } catch (error) {
      throw new Error(`列出数据失败: ${error.message}`);
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpired() {
    try {
      const categories = await fs.readdir(this.cacheDir);
      let cleanedCount = 0;

      for (const category of categories) {
        try {
          const items = await this.list(category);

          for (const item of items) {
            if (item.metadata.ttl && new Date(item.metadata.ttl) < new Date()) {
              await this.delete(item.key, category);
              cleanedCount++;
            }
          }
        } catch (error) {
          console.warn(`清理分类 ${category} 失败:`, error.message);
        }
      }

      return { cleanedCount };
    } catch (error) {
      throw new Error(`清理过期数据失败: ${error.message}`);
    }
  }

  /**
   * 创建备份
   */
  async createBackup(category = null, backupName = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const name = backupName || `backup-${timestamp}`;
      const backupDir = path.join(this.backupsDir, name);

      await fs.mkdir(backupDir, { recursive: true });

      if (category) {
        // 备份特定分类
        const sourceDir = path.join(this.cacheDir, category);
        const targetDir = path.join(backupDir, category);

        await this.copyDirectory(sourceDir, targetDir);
      } else {
        // 备份所有数据
        await this.copyDirectory(this.cacheDir, backupDir);
      }

      // 创建备份信息
      const backupInfo = {
        name,
        created: new Date().toISOString(),
        category,
        size: await this.getDirectorySize(backupDir),
        files: await this.countFiles(backupDir)
      };

      await fs.writeFile(
        path.join(backupDir, 'backup-info.json'),
        JSON.stringify(backupInfo, null, 2)
      );

      return backupInfo;
    } catch (error) {
      throw new Error(`创建备份失败: ${error.message}`);
    }
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupName, category = null) {
    try {
      const backupDir = path.join(this.backupsDir, backupName);
      const backupInfoPath = path.join(backupDir, 'backup-info.json');

      // 检查备份是否存在
      try {
        await fs.access(backupInfoPath);
      } catch (error) {
        throw new Error(`备份不存在: ${backupName}`);
      }

      const backupInfo = JSON.parse(await fs.readFile(backupInfoPath, 'utf8'));

      if (category) {
        // 恢复特定分类
        const sourceDir = path.join(backupDir, category);
        const targetDir = path.join(this.cacheDir, category);

        await this.copyDirectory(sourceDir, targetDir);
      } else {
        // 恢复所有数据
        await this.copyDirectory(backupDir, this.cacheDir, ['backup-info.json']);
      }

      return backupInfo;
    } catch (error) {
      throw new Error(`恢复备份失败: ${error.message}`);
    }
  }

  /**
   * 列出所有备份
   */
  async listBackups() {
    try {
      const backups = await fs.readdir(this.backupsDir);
      const backupList = [];

      for (const backup of backups) {
        try {
          const backupInfoPath = path.join(this.backupsDir, backup, 'backup-info.json');
          const backupInfo = JSON.parse(await fs.readFile(backupInfoPath, 'utf8'));
          backupList.push(backupInfo);
        } catch (error) {
          // 忽略损坏的备份
        }
      }

      return backupList.sort((a, b) => new Date(b.created) - new Date(a.created));
    } catch (error) {
      throw new Error(`列出备份失败: ${error.message}`);
    }
  }

  /**
   * 删除备份
   */
  async deleteBackup(backupName) {
    try {
      const backupDir = path.join(this.backupsDir, backupName);
      await this.removeDirectory(backupDir);
      return { success: true, backupName };
    } catch (error) {
      throw new Error(`删除备份失败: ${error.message}`);
    }
  }

  /**
   * 保存日志
   */
  async saveLog(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      context
    };

    const date = timestamp.split('T')[0];
    const logFile = path.join(this.logsDir, `${date}.log`);

    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');

    // 清理旧日志（保留30天）
    await this.cleanupOldLogs();
  }

  /**
   * 清理旧日志
   */
  async cleanupOldLogs() {
    try {
      const files = await fs.readdir(this.logsDir);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (file.endsWith('.log')) {
          const dateStr = file.replace('.log', '');
          const fileDate = new Date(dateStr);

          if (fileDate < thirtyDaysAgo) {
            await fs.unlink(path.join(this.logsDir, file));
          }
        }
      }
    } catch (error) {
      console.warn('清理旧日志失败:', error.message);
    }
  }

  /**
   * 复制目录
   */
  async copyDirectory(source, target, exclude = []) {
    await fs.mkdir(target, { recursive: true });
    const items = await fs.readdir(source);

    for (const item of items) {
      if (exclude.includes(item)) continue;

      const sourcePath = path.join(source, item);
      const targetPath = path.join(target, item);
      const stats = await fs.stat(sourcePath);

      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  /**
   * 删除目录
   */
  async removeDirectory(dir) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // 兼容旧版本Node.js
      const items = await fs.readdir(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          await this.removeDirectory(itemPath);
        } else {
          await fs.unlink(itemPath);
        }
      }
      await fs.rmdir(dir);
    }
  }

  /**
   * 获取目录大小
   */
  async getDirectorySize(dir) {
    let totalSize = 0;
    const items = await fs.readdir(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        totalSize += await this.getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  /**
   * 计算文件数量
   */
  async countFiles(dir) {
    let count = 0;
    const items = await fs.readdir(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        count += await this.countFiles(itemPath);
      } else {
        count++;
      }
    }

    return count;
  }

  /**
   * 创建临时文件
   */
  async createTempFile(data, extension = 'tmp') {
    const id = crypto.randomBytes(16).toString('hex');
    const fileName = `${id}.${extension}`;
    const filePath = path.join(this.tempDir, fileName);

    const content = typeof data === 'string' ? data : JSON.stringify(data);
    await fs.writeFile(filePath, content);

    return { id, fileName, filePath };
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats() {
    try {
      const stats = {
        cache: {
          size: await this.getDirectorySize(this.cacheDir),
          files: await this.countFiles(this.cacheDir)
        },
        logs: {
          size: await this.getDirectorySize(this.logsDir),
          files: await this.countFiles(this.logsDir)
        },
        backups: {
          size: await this.getDirectorySize(this.backupsDir),
          files: await this.countFiles(this.backupsDir),
          count: (await fs.readdir(this.backupsDir)).length
        },
        temp: {
          size: await this.getDirectorySize(this.tempDir),
          files: await this.countFiles(this.tempDir)
        },
        total: {
          size: await this.getDirectorySize(this.baseDir),
          files: await this.countFiles(this.baseDir)
        }
      };

      return stats;
    } catch (error) {
      throw new Error(`获取存储统计失败: ${error.message}`);
    }
  }
}

module.exports = PersistenceManager;