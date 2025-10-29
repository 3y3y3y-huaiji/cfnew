# Cloudflare Workers 代理服务

一个基于 Cloudflare Workers 的高性能代理服务，支持多种协议和自定义配置。

## 功能特点

- 🚀 高性能代理服务
- 🔧 灵活的配置选项
- 🌍 支持多地区节点
- 📊 实时监控和统计
- 🔒 安全的代码混淆
- 📱 多客户端支持

## 项目结构

```
cfnew-main/
├── src/                    # 源代码目录
│   ├── 明文源码.js         # 主要源代码
│   └── snippets            # 代码片段
├── build/                  # 构建输出目录
│   ├── worker.js           # 混淆后的代码
│   └── build-info.json     # 构建信息
├── scripts/                # 脚本目录
│   └── obfuscate.js        # 代码混淆脚本
├── config/                 # 配置文件目录
├── package.json            # 项目配置
└── README.md               # 项目说明
```

## 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建项目

```bash
npm run build
```

### 部署到 Cloudflare

```bash
npm run deploy
```

## 配置说明

### KV 存储配置

使用 Cloudflare KV 存储来管理配置数据：

```javascript
// 初始化 KV 存储
const env = {
  CONFIG_KV: "your_kv_namespace"
};
```

### API 管理

支持通过 API 管理配置：

```javascript
// 获取配置
GET /api/config

// 更新配置
POST /api/config
{
  "key": "value"
}
```

### 节点自定义命名

支持为节点设置自定义名称：

```javascript
// 节点映射配置
const nodeMapping = {
  "node1": "自定义节点名称",
  "node2": "另一个节点名称"
};
```

## 配置参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| u/uuid | string | 是 | 用户唯一标识 |
| p/proxyip | string | 是 | 代理服务器地址 |
| port | number | 否 | 代理服务器端口，默认 8080 |
| region | string | 否 | 优选地区，默认 香港 |

## API 功能

### 获取节点列表

```javascript
GET /api/nodes
```

### 获取节点状态

```javascript
GET /api/nodes/:id/status
```

### 添加节点

```javascript
POST /api/nodes
{
  "name": "节点名称",
  "address": "节点地址",
  "port": 8080,
  "region": "香港"
}
```

### 删除节点

```javascript
DELETE /api/nodes/:id
```

## 多客户端支持

支持多种客户端连接：

- **WebSocket**: 实时双向通信
- **HTTP**: 标准 HTTP 代理
- **SOCKS5**: SOCKS5 代理协议

## 性能优化

- 代码混淆和压缩
- 连接池管理
- 缓存策略
- 负载均衡

## 开发指南

### 添加新功能

1. 在 `src/明文源码.js` 中添加功能代码
2. 运行 `npm run build` 构建项目
3. 测试功能是否正常工作

### 自定义混淆配置

编辑 `scripts/obfuscate.js` 文件中的混淆选项：

```javascript
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  // 更多选项...
};
```

## 常见问题

### 如何设置自定义节点？

在配置文件中添加节点信息：

```javascript
const customNodes = [
  {
    name: "节点名称",
    address: "节点地址",
    port: 8080,
    region: "香港"
  }
];
```

### 如何启用调试模式？

设置环境变量：

```bash
export NODE_ENV=development
npm run build
```

## 许可证

MIT License

## 贡献

欢迎提交 Pull Request 和 Issue！

## 作者

Joey

## 项目地址

https://github.com/byJoey/cfnew