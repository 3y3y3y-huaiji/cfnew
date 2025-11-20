const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const sourceFileName = '少年你相信光吗'; // 使用混淆后的文件作为源
const outputFileName = '少年你相信光吗'; // 输出到同一个文件
const sourceFilePath = path.join(process.cwd(), sourceFileName);

if (!fs.existsSync(sourceFilePath)) {
  console.error('错误：在路径 \'' + sourceFilePath + '\' 未找到源文件。请确保您的仓库根目录有名为 \'' + sourceFileName + '\' 的文件。');
  process.exit(1);
}

const originalCode = fs.readFileSync(sourceFilePath, 'utf8');

if (!originalCode || originalCode.trim().length === 0) {
  console.error('错误：源文件 ' + sourceFileName + ' 为空。');
  process.exit(1);
}

const obfuscationOptions = {
    compact: true,
    controlFlowFlattening: false,
    controlFlowFlatteningThreshold: 0,
    deadCodeInjection: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 1.0,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: false,
    stringArrayWrappersParametersMaxCount: 3,
    renameGlobals: true,
    identifierNamesGenerator: 'mangled-shuffled',
    identifierNamesCache: null,
    identifiersPrefix: '',
    renameProperties: false,
    renamePropertiesMode: 'safe',
    ignoreImports: false,
    target: 'browser',
    numbersToExpressions: false,
    simplify: false,
    splitStrings: true,
    splitStringsChunkLength: 1,
    transformObjectKeys: false,
    unicodeEscapeSequence: true,
    selfDefending: false,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: true,
    domainLock: []
};

const obfuscatedCode = JavaScriptObfuscator.obfuscate(originalCode, obfuscationOptions).getObfuscatedCode();

fs.writeFileSync(path.join(process.cwd(), outputFileName), obfuscatedCode, 'utf8');
console.log('成功将 \'' + sourceFileName + '\' 混淆并保存至 \'' + outputFileName + '\'。');