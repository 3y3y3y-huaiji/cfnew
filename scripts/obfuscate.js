const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 配置
const config = {
  sourceFile: path.join(__dirname, '..', 'src', '明文源码.js'),
  outputFile: path.join(__dirname, '..', 'build', 'worker.js'),
  snippetsFile: path.join(__dirname, '..', 'src', 'snippets'),
  debugMode: process.env.NODE_ENV === 'development'
};

// 高级混淆选项
const obfuscationOptions = {
  // 基本选项
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.1,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: !config.debugMode,
  debugProtectionInterval: !config.debugMode ? 4000 : 0,
  
  // 字符串混淆
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  rotateStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  unicodeEscapeSequence: false,
  
  // 标识符重命名
  renameGlobals: false,
  identifierNamesGenerator: 'hexadecimal',
  identifiersPrefix: '',
  
  // 其他选项
  simplify: true,
  shuffleStringArray: true,
  selfDefending: !config.debugMode,
  transformObjectKeys: true,
  numbersToExpressions: true
};

// 读取源文件和snippets
function readSourceFiles() {
  console.log('正在读取源文件...');
  
  const sourceCode = fs.readFileSync(config.sourceFile, 'utf8');
  const snippetsCode = fs.readFileSync(config.snippetsFile, 'utf8');
  
  // 合并源代码和snippets
  const fullSourceCode = sourceCode.replace('// SNIPPETS_PLACEHOLDER', snippetsCode);
  
  return fullSourceCode;
}

// 生成随机标识符
function generateRandomId() {
  return crypto.randomBytes(8).toString('hex');
}

// 添加反调试和完整性检查
function addProtectionCode(code) {
  const protectionCode = `
(function() {
  var _0x${generateRandomId()} = function() {
    var _0x${generateRandomId()} = {
      'check': function() {
        try {
          // 基本反调试
          (function() {
            return (function() {}).constructor('return this')();
          })();
        } catch (_0x${generateRandomId()}) {
          return false;
        }
        return true;
      }
    };
    return _0x${generateRandomId()};
  }();
  
  if (!_0x${generateRandomId()}.check()) {
    // 如果检测到调试，可以采取一些措施
    console.clear();
  }
})();
`;
  
  return protectionCode + code;
}

// 添加许可证信息
function addLicense(code) {
  const license = `/*
 * Cloudflare Workers 代理服务
 * 版本: 1.0.0
 * 许可证: MIT
 * 作者: Joey
 * 项目地址: https://github.com/byJoey/cfnew
 */
`;
  
  return license + code;
}

// 执行混淆
function obfuscateCode(sourceCode) {
  // 开发模式下不进行混淆，直接返回源代码
  if (config.debugMode) {
    console.log('开发模式：跳过混淆，直接使用源代码');
    return addLicense(sourceCode);
  }
  
  console.log('正在混淆代码...');
  
  // 添加保护代码
  const protectedCode = addProtectionCode(sourceCode);
  
  // 执行混淆
  const obfuscationResult = JavaScriptObfuscator.obfuscate(protectedCode, obfuscationOptions);
  
  // 添加许可证信息
  const finalCode = addLicense(obfuscationResult.getObfuscatedCode());
  
  return finalCode;
}

// 生成源映射（调试用）
function generateSourceMap(obfuscatedCode) {
  if (config.debugMode) {
    console.log('调试模式：生成源映射...');
    // 这里可以添加源映射生成逻辑
  }
  return null;
}

// 主函数
function main() {
  try {
    console.log('开始构建混淆代码...');
    
    // 确保输出目录存在
    const outputDir = path.dirname(config.outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 读取源文件
    const sourceCode = readSourceFiles();
    
    // 混淆代码
    const obfuscatedCode = obfuscateCode(sourceCode);
    
    // 生成源映射（调试用）
    const sourceMap = generateSourceMap(obfuscatedCode);
    
    // 写入混淆后的文件
    fs.writeFileSync(config.outputFile, obfuscatedCode);
    
    if (sourceMap) {
      fs.writeFileSync(config.outputFile + '.map', sourceMap);
    }
    
    // 计算压缩率
    const originalSize = Buffer.byteLength(sourceCode, 'utf8');
    const obfuscatedSize = Buffer.byteLength(obfuscatedCode, 'utf8');
    const compressionRatio = ((originalSize - obfuscatedSize) / originalSize * 100).toFixed(2);
    
    console.log('代码混淆完成！');
    console.log(`原始大小: ${originalSize} 字节`);
    console.log(`混淆后大小: ${obfuscatedSize} 字节`);
    console.log(`压缩率: ${compressionRatio}%`);
    
    // 生成构建信息
    const buildInfo = {
      timestamp: new Date().toISOString(),
      originalSize,
      obfuscatedSize,
      compressionRatio,
      debugMode: config.debugMode
    };
    
    fs.writeFileSync(
      path.join(path.dirname(config.outputFile), 'build-info.json'),
      JSON.stringify(buildInfo, null, 2)
    );
    
  } catch (error) {
    console.error('构建过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行主函数
main();