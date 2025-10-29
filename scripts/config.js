const fs = require('fs');
const path = require('path');

// 配置
const config = {
  configFile: path.join(__dirname, '..', 'config', 'default.json'),
  srcDir: path.join(__dirname, '..', 'src'),
  buildDir: path.join(__dirname, '..', 'build'),
  scriptsDir: path.join(__dirname, '..', 'scripts'),
  mainFile: '明文源码.js',
  snippetsFile: 'snippets'
};

// 默认配置
const defaultConfig = {
  // 基本配置
  "authToken": "",
  "fallbackAddress": ["proxyip1.com", "proxyip2.com"],
  "fallbackPort": 80,
  
  // 地区映射
  "regionMapping": {
    "HK": "香港",
    "SG": "新加坡",
    "JP": "日本",
    "US": "美国",
    "KR": "韩国",
    "DE": "德国",
    "UK": "英国",
    "FR": "法国",
    "CA": "加拿大",
    "AU": "澳大利亚",
    "IN": "印度",
    "BR": "巴西",
    "NL": "荷兰",
    "RU": "俄罗斯"
  },
  
  // 备用IP列表
  "backupIPs": [
    "1.1.1.1",
    "8.8.8.8",
    "9.9.9.9"
  ],
  
  // 直连域名列表
  "directDomains": [
    "cloudflare.com",
    "workers.dev"
  ],
  
  // 错误代码
  "errors": {
    "E_INVALID_DATA": "无效数据",
    "E_AUTH_FAILED": "认证失败",
    "E_CONNECTION_FAILED": "连接失败",
    "E_TIMEOUT": "请求超时",
    "E_RATE_LIMIT": "请求频率限制"
  },
  
  // 混淆选项
  "obfuscation": {
    "compact": true,
    "controlFlowFlattening": true,
    "controlFlowFlatteningThreshold": 0.1,
    "deadCodeInjection": true,
    "deadCodeInjectionThreshold": 0.4,
    "debugProtection": true,
    "debugProtectionInterval": 4000,
    "stringArray": true,
    "stringArrayThreshold": 0.75,
    "stringArrayEncoding": ["base64"],
    "rotateStringArray": true,
    "splitStrings": true,
    "splitStringsChunkLength": 10,
    "unicodeEscapeSequence": false,
    "renameGlobals": false,
    "identifierNamesGenerator": "hexadecimal",
    "identifiersPrefix": "",
    "simplify": true,
    "shuffleStringArray": true,
    "selfDefending": true,
    "transformObjectKeys": true,
    "numbersToExpressions": true
  }
};

// 确保配置目录存在
function ensureConfigDir() {
  const configDir = path.dirname(config.configFile);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

// 创建默认配置文件
function createDefaultConfig() {
  ensureConfigDir();
  
  if (!fs.existsSync(config.configFile)) {
    fs.writeFileSync(config.configFile, JSON.stringify(defaultConfig, null, 2));
    console.log(`默认配置文件已创建: ${config.configFile}`);
  } else {
    console.log(`配置文件已存在: ${config.configFile}`);
  }
}

// 读取配置文件
function loadConfig() {
  if (!fs.existsSync(config.configFile)) {
    createDefaultConfig();
  }
  
  try {
    const configData = fs.readFileSync(config.configFile, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error(`读取配置文件失败: ${error.message}`);
    return defaultConfig;
  }
}

// 保存配置文件
function saveConfig(configData) {
  ensureConfigDir();
  
  try {
    fs.writeFileSync(config.configFile, JSON.stringify(configData, null, 2));
    console.log(`配置文件已保存: ${config.configFile}`);
  } catch (error) {
    console.error(`保存配置文件失败: ${error.message}`);
  }
}

// 更新配置
function updateConfig(updates) {
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...updates };
  saveConfig(newConfig);
  return newConfig;
}

// 重置配置
function resetConfig() {
  saveConfig(defaultConfig);
  console.log('配置已重置为默认值');
}

// 验证配置
function validateConfig(configData) {
  const requiredFields = ['authToken', 'fallbackAddress', 'regionMapping'];
  const missingFields = requiredFields.filter(field => !configData[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`配置缺少必要字段: ${missingFields.join(', ')}`);
  }
  
  return true;
}

// 导出配置
function exportConfig(filePath) {
  const configData = loadConfig();
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(configData, null, 2));
    console.log(`配置已导出到: ${filePath}`);
  } catch (error) {
    console.error(`导出配置失败: ${error.message}`);
  }
}

// 导入配置
function importConfig(filePath) {
  try {
    const configData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    validateConfig(configData);
    saveConfig(configData);
    console.log(`配置已从文件导入: ${filePath}`);
  } catch (error) {
    console.error(`导入配置失败: ${error.message}`);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      createDefaultConfig();
      break;
    case 'load':
      console.log(JSON.stringify(loadConfig(), null, 2));
      break;
    case 'reset':
      resetConfig();
      break;
    case 'export':
      if (process.argv[3]) {
        exportConfig(process.argv[3]);
      } else {
        console.error('请指定导出文件路径');
      }
      break;
    case 'import':
      if (process.argv[3]) {
        importConfig(process.argv[3]);
      } else {
        console.error('请指定导入文件路径');
      }
      break;
    default:
      console.log('可用命令:');
      console.log('  create - 创建默认配置文件');
      console.log('  load - 加载并显示当前配置');
      console.log('  reset - 重置为默认配置');
      console.log('  export <path> - 导出配置到指定文件');
      console.log('  import <path> - 从指定文件导入配置');
  }
}

module.exports = {
  config,
  defaultConfig,
  createDefaultConfig,
  loadConfig,
  saveConfig,
  updateConfig,
  resetConfig,
  validateConfig,
  exportConfig,
  importConfig
};