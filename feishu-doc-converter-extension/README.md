# Cloud File Converter - 飞书文档转换器 🚀

## 项目简介

Cloud File Converter 是一款强大的 Chrome 浏览器扩展，专为提高文档处理效率而设计。它能够快速将飞书文档转换为长文本或图片，帮助用户轻松管理和分享文档。

## 🌟 主要功能

- 🔄 将飞书文档转换为长文本
- 📸 将飞书文档转换为高质量图片
- 🚀 一键快速转换
- 💾 支持多种导出格式

## 技术栈

- Vite
- Pinia
- Element Plus
- Axios

## 🛠️ 安装与使用

### 开发环境准备

1. 克隆项目

```bash
git clone https://github.com/your-repo/cloud-file-converter.git
cd cloud-file-converter
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

- 复制 `.env.example` 为 `.env`
- 填写你的飞书应用凭证

4. 启动开发服务器

```bash
npm run dev
```

### Chrome 扩展安装

1. 打开 Chrome 浏览器的扩展管理器
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目的 `dist` 目录

## 🔐 环境变量配置

在 `.env` 文件中配置以下变量：

```env
VITE_FEISHU_APP_ID=your_app_id
VITE_FEISHU_APP_SECRET=your_app_secret
```

## 📄 许可证

本项目采用 MIT 许可证。详见 `LICENSE` 文件。

## 🐛 问题反馈

如遇到任何问题，请在 GitHub Issues 中提交。

## 🌈 未来计划

- [ ] 支持更多文档平台
- [ ] 优化转换性能
- [ ] 增加更多导出样式模板

##模版&转换
知乎：知乎，人人都是产品经理
微信：微信,cdsn
小红书：图文
juejin:juejin

---

发布谷歌商店的时候要说明 manifest 的 host_permissions 是什么用处
{
"manifest_version": 3,
"name": "飞书 2ALL - 将飞书转换为所有平台样式",
"description": "目前支持公众号、小红书、知乎、人人都是产品经理、稀土掘金、CSDN 的样式转换",
"version": "1.2",
"action": {
"default_icon": {
"16": "logo.png",
"48": "logo.png",
"128": "logo.png"
}
},
"background": {
"service_worker": "background.js"
},
"permissions": [
"clipboardWrite",
"clipboardRead",
"scripting",
"identity",
"storage",
"identity.email"
],
"host_permissions": [
"*://*.feishu.cn/*",
"https://open.feishu.cn/*",
"*://*.weixin.qq.com/*",
"*://zhuanlan.zhihu.com/*",
"*://*.woshipm.com/*",
"*://*.juejin.cn/*",
"*://mp.csdn.net/*"
],
"icons": {
"16": "logo.png",
"48": "logo.png",
"128": "logo.png"
},
"content_security_policy": {
"extension_pages": "script-src 'self'; object-src 'self'",
"sandbox": "sandbox allow-scripts; script-src 'self' https://www.googletagmanager.com"
},
"oauth2": {
"client_id": "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
"scopes": [
"https://www.googleapis.com/auth/userinfo.email",
"https://www.googleapis.com/auth/userinfo.profile"
]
},
"key": "YOUR_EXTENSION_PUBLIC_KEY"
}

**Happy Converting!** 📝✨
