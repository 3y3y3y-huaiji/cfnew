#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// 日志函数
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 显示帮助信息
function showHelp() {
  log('Cloudflare Workers 代理服务 - 构建工具', 'bright');
  log('');
  log('用法: npm run <command> [options]', 'cyan');
  log('');
  log('可用命令:', 'bright');
  log('  build          构建项目（混淆代码）', 'green');
  log('  dev            开发模式构建（不混淆）', 'green');
  log('  clean          清理构建目录', 'green');
  log('  deploy         部署到 Cloudflare Workers', 'green');
  log('  config         配置管理', 'green');
  log('  help           显示帮助信息', 'green');
  log('');
  log('配置管理命令:', 'bright');
  log('  npm run config create    创建默认配置文件', 'yellow');
  log('  npm run config load      加载并显示当前配置', 'yellow');
  log('  npm run config reset     重置为默认配置', 'yellow');
  log('  npm run config export    导出配置到指定文件', 'yellow');
  log('  npm run config import    从指定文件导入配置', 'yellow');
  log('');
  log('示例:', 'bright');
  log('  npm run build', 'cyan');
  log('  npm run dev', 'cyan');
  log('  npm run config export ./my-config.json', 'cyan');
  log('  npm run config import ./my-config.json', 'cyan');
}

// 检查依赖
function checkDependencies() {
  log('检查依赖...', 'yellow');
  
  try {
    execSync('npm list javascript-obfuscator', { stdio: 'pipe' });
    log('依赖检查通过', 'green');
  } catch (error) {
    log('缺少必要依赖，正在安装...', 'yellow');
    execSync('npm install', { stdio: 'inherit' });
    log('依赖安装完成', 'green');
  }
}

// 构建项目
function build(options = {}) {
  const isDev = options.dev || false;
  
  log(`开始${isDev ? '开发模式' : ''}构建...`, 'bright');
  
  // 设置环境变量
  if (isDev) {
    process.env.NODE_ENV = 'development';
    log('开发模式：代码不会被混淆', 'yellow');
  } else {
    process.env.NODE_ENV = 'production';
    log('生产模式：代码将被混淆', 'yellow');
  }
  
  try {
    // 执行构建脚本
    execSync('node scripts/build.js', { stdio: 'inherit' });
    
    // 显示构建结果
    const buildInfoPath = path.join(__dirname, '..', 'build', 'build-info.json');
    if (fs.existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      log('');
      log('构建统计:', 'bright');
      log(`  原始大小: ${buildInfo.input.size} 字节`, 'cyan');
      log(`  输出大小: ${buildInfo.output.size} 字节`, 'cyan');
      log(`  压缩率: ${buildInfo.compression.ratio}`, 'cyan');
    }
    
    log(`${isDev ? '开发模式' : ''}构建完成！`, 'green');
  } catch (error) {
    log('构建失败', 'red');
    process.exit(1);
  }
}

// 清理构建目录
function clean() {
  log('清理构建目录...', 'yellow');
  
  const buildDir = path.join(__dirname, '..', 'build');
  
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
    log('构建目录已清理', 'green');
  } else {
    log('构建目录不存在，无需清理', 'yellow');
  }
}

// 部署到 Cloudflare Workers
function deploy() {
  log('部署到 Cloudflare Workers...', 'bright');
  
  try {
    // 检查是否安装了 Wrangler
    execSync('npx wrangler --version', { stdio: 'pipe' });
  } catch (error) {
    log('未找到 Wrangler CLI，正在安装...', 'yellow');
    execSync('npm install -g wrangler', { stdio: 'inherit' });
  }
  
  try {
    // 执行部署
    execSync('npx wrangler deploy', { stdio: 'inherit' });
    log('部署完成！', 'green');
  } catch (error) {
    log('部署失败', 'red');
    log('请确保已正确配置 Wrangler', 'yellow');
    process.exit(1);
  }
}

// 配置管理
function config(args) {
  const command = args[0];
  
  if (!command) {
    log('请指定配置命令', 'red');
    log('使用 "npm run config help" 查看可用命令', 'yellow');
    return;
  }
  
  try {
    // 执行配置脚本
    execSync(`node scripts/config.js ${command} ${args.slice(1).join(' ')}`, { stdio: 'inherit' });
  } catch (error) {
    log('配置操作失败', 'red');
    process.exit(1);
  }
}

// 主函数
function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'build':
      checkDependencies();
      build({ dev: false });
      break;
    case 'dev':
      checkDependencies();
      build({ dev: true });
      break;
    case 'clean':
      clean();
      break;
    case 'deploy':
      checkDependencies();
      build(); // 先构建
      deploy();
      break;
    case 'config':
      config(args);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      if (!command) {
        showHelp();
      } else {
        log(`未知命令: ${command}`, 'red');
        log('使用 "npm run help" 查看可用命令', 'yellow');
        process.exit(1);
      }
  }
}

// 运行主函数
main();