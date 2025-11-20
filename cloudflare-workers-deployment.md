# Cloudflare Workers 部署配置

## 1. 项目概述

本项目是一个基于Cloudflare Workers的多协议代理服务，使用Cloudflare Workers平台进行部署。

## 2. 部署配置文件 (wrangler.toml)

创建以下配置文件：

```toml
name = "cfnew-proxy"
main = "_worker.js"
compatibility_date = "2023-01-01"

[[kv_namespaces]]
binding = "KV_CONFIG"
id = "YOUR_KV_NAMESPACE_ID"
preview_id = "YOUR_KV_NAMESPACE_PREVIEW_ID"

[vars]
DEFAULT_PROTOCOL = "vless"
DEFAULT_PATH = "/"
# 其他环境变量...
```

## 3. Worker入口文件 (_worker.js)

项目的主要Worker文件是`少年你相信光吗`，它包含了完整的代理服务代码。

一个简单的Worker示例：

```javascript
addEventListener('fetch', event => { 
  event.respondWith(new Response('Hello World')); 
});
```

## 4. 构建和部署命令

### 构建命令
```bash
pnpm install && node obfuscate.js
```

### 部署命令
```bash
# 安装wrangler
npm install -g wrangler

# 登录Cloudflare账号
npx wrangler login

# 部署Worker
npx wrangler deploy
```

## 5. 环境变量配置

在wrangler.toml或Cloudflare Workers控制台中配置以下环境变量：

| 变量名称 | 值示例 | 说明 |
|---------|-------|------|
| DEFAULT_PROTOCOL | "vless" | 默认协议 |
| DEFAULT_PATH | "/" | 默认访问路径 |
| CUSTOM_PATH | "/myproxy" | 自定义访问路径（可选） |
| TROJAN_PASSWORD | "your_password" | Trojan协议密码 |
| SUBSCRIPTION_URL | "https://your-subscription-url" | 订阅转换服务URL |

## 6. GitHub Actions自动部署

项目使用GitHub Actions自动构建和部署：

```yaml
name: Generate and Obfuscate Worker Script

on:
  workflow_dispatch:
  push:
    branches:
      - '**'  # 仅匹配分支推送，排除标签推送
    paths:
      - '少年你相信光吗'  # 只关注混淆后的文件

jobs:
  build-and-obfuscate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install Obfuscator
        run: pnpm install javascript-obfuscator

      - name: Obfuscate code
        run: node obfuscate.js

      - name: Commit and push the obfuscated file
        run: |
          git config --global user.name 'GitHub Actions Bot'
          git config --global user.email 'github-actions[bot]@users.noreply.github.com'
          git add '少年你相信光吗'
          if git diff --staged --quiet; then
            echo "No changes to commit, the obfuscated file is already up-to-date."
          else
            git commit -m "部署用这个"
            git push
          fi
```

## 7. 部署验证

部署完成后，使用以下方法验证：

1. **访问服务URL**：`https://cfnew-proxy.YOUR_DOMAIN.workers.dev`
2. **检查Cloudflare Workers控制台**：确认部署状态为"Active"
3. **测试功能**：使用客户端工具测试代理功能

## 8. 高级设置

### 8.1 API令牌配置

创建Cloudflare API令牌：

1. 登录Cloudflare控制台
2. 转到"My Profile" > "API Tokens"
3. 点击"Create Token"
4. 选择"Edit Cloudflare Workers"
5. 按照提示完成配置并生成令牌

在wrangler.toml中配置：

```toml
[env.production]
api_token = "your_token_here"
```

### 8.2 KV命名空间配置

如果需要使用KV存储：

1. 在Cloudflare Workers控制台创建KV命名空间
2. 获取KV命名空间ID
3. 在wrangler.toml中配置（如前面的示例所示）

## 9. 注意事项

1. 确保Node.js版本为18或更高
2. 使用pnpm替代npm以提高性能和安全性
3. 定期更新依赖以确保安全性
4. 注意保护敏感信息，如API令牌和密码
5. 测试环境和生产环境使用不同的配置
