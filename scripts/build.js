const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const config = {
  srcDir: path.join(__dirname, '..', 'src'),
  buildDir: path.join(__dirname, '..', 'build'),
  scriptsDir: path.join(__dirname, '..', 'scripts'),
  configDir: path.join(__dirname, '..', 'config'),
  mainFile: '明文源码.js',
  snippetsFile: 'snippets',
  outputFile: 'worker.js'
};

// 日志函数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '[ERROR]' : type === 'warn' ? '[WARN]' : '[INFO]';
  console.log(`${timestamp} ${prefix} ${message}`);
}

// 清理构建目录
function cleanBuildDir() {
  log('清理构建目录...');
  if (fs.existsSync(config.buildDir)) {
    fs.rmSync(config.buildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(config.buildDir, { recursive: true });
  log('构建目录已清理');
}

// 检查源文件是否存在
function checkSourceFiles() {
  const mainFilePath = path.join(config.srcDir, config.mainFile);
  const snippetsFilePath = path.join(config.srcDir, config.snippetsFile);
  
  if (!fs.existsSync(mainFilePath)) {
    throw new Error(`主源文件不存在: ${mainFilePath}`);
  }
  
  if (!fs.existsSync(snippetsFilePath)) {
    throw new Error(`Snippets文件不存在: ${snippetsFilePath}`);
  }
  
  log('源文件检查完成');
}

// 合并源文件和snippets
function mergeSourceFiles() {
  log('合并源文件...');
  
  const mainFilePath = path.join(config.srcDir, config.mainFile);
  const snippetsFilePath = path.join(config.srcDir, config.snippetsFile);
  const mergedFilePath = path.join(config.buildDir, 'merged.js');
  
  const mainContent = fs.readFileSync(mainFilePath, 'utf8');
  const snippetsContent = fs.readFileSync(snippetsFilePath, 'utf8');
  
  // 替换占位符
  const mergedContent = mainContent.replace('// SNIPPETS_PLACEHOLDER', snippetsContent);
  
  fs.writeFileSync(mergedFilePath, mergedContent);
  log('源文件合并完成');
  
  return mergedFilePath;
}

// 运行混淆脚本
function runObfuscation(inputFile) {
  log('开始代码混淆...');
  
  const obfuscateScript = path.join(config.scriptsDir, 'obfuscate.js');
  
  try {
    // 设置环境变量，让混淆脚本知道输入文件
    process.env.INPUT_FILE = inputFile;
    
    // 执行混淆脚本
    execSync(`node "${obfuscateScript}"`, { stdio: 'inherit' });
    log('代码混淆完成');
  } catch (error) {
    log(`代码混淆失败: ${error.message}`, 'error');
    throw error;
  }
}

// 生成构建信息
function generateBuildInfo(inputFile, outputFile) {
  log('生成构建信息...');
  
  const inputStats = fs.statSync(inputFile);
  const outputStats = fs.statSync(outputFile);
  
  const buildInfo = {
    timestamp: new Date().toISOString(),
    input: {
      file: inputFile,
      size: inputStats.size,
      lastModified: inputStats.mtime.toISOString()
    },
    output: {
      file: outputFile,
      size: outputStats.size,
      lastModified: outputStats.mtime.toISOString()
    },
    compression: {
      ratio: ((1 - outputStats.size / inputStats.size) * 100).toFixed(2) + '%',
      savedBytes: inputStats.size - outputStats.size
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
  
  const buildInfoPath = path.join(config.buildDir, 'build-info.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  log('构建信息已生成');
}

// 主函数
function main() {
  try {
    log('开始构建过程...');
    
    // 清理构建目录
    cleanBuildDir();
    
    // 检查源文件
    checkSourceFiles();
    
    // 合并源文件
    const mergedFile = mergeSourceFiles();
    
    // 运行混淆
    runObfuscation(mergedFile);
    
    // 生成构建信息
    const outputFile = path.join(config.buildDir, config.outputFile);
    generateBuildInfo(mergedFile, outputFile);
    
    log('构建完成！');
    log(`输出文件: ${outputFile}`);
    
    // 显示构建统计
    const buildInfo = JSON.parse(fs.readFileSync(path.join(config.buildDir, 'build-info.json'), 'utf8'));
    log(`原始大小: ${buildInfo.input.size} 字节`);
    log(`输出大小: ${buildInfo.output.size} 字节`);
    log(`压缩率: ${buildInfo.compression.ratio}`);
    
  } catch (error) {
    log(`构建失败: ${error.message}`, 'error');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { main, config };