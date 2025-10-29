const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

// 读取源文件
const sourceFile = path.join(__dirname, '明文源码.js');
const sourceCode = fs.readFileSync(sourceFile, 'utf8');

// 配置混淆选项
const obfuscationOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.1,
    stringArray: true,
    stringArrayThreshold: 0.75,
    rotateStringArray: true,
    stringArrayEncoding: ['base64'],
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    renameGlobals: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10
};

// 执行混淆
const obfuscatedCode = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions).getObfuscatedCode();

// 写入混淆后的文件
const outputFile = path.join(__dirname, '少年你相信光吗.js');
fs.writeFileSync(outputFile, obfuscatedCode);

console.log('代码混淆完成！');