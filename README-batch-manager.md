# NotionNext 批量文档管理系统

## 🚀 功能介绍

基于 [elog](https://github.com/LetTTGACO/elog) 项目设计理念，为 NotionNext 博客系统新增的批量文档管理功能，支持：

- **📤 批量导出**: 从 Notion 数据库批量导出 Markdown 文档
- **📥 批量上传**: 将本地 Markdown 文件批量上传到 Notion
- **🔍 智能筛选**: 支持多维度条件筛选和预览
- **✅ 文件验证**: 自动验证文件格式和 Front Matter 语法
- **🎨 现代界面**: 美观的 Web 管理界面，支持拖拽操作

## 📦 安装依赖

安装新增的依赖包：

```bash
npm install gray-matter js-yaml jszip file-saver turndown turndown-plugin-gfm
npm install -D @types/js-yaml @types/file-saver
```

或使用 yarn：

```bash
yarn add gray-matter js-yaml jszip file-saver turndown turndown-plugin-gfm
yarn add -D @types/js-yaml @types/file-saver
```

## 🛠️ 配置设置

### 1. 环境变量配置

在 `.env.local` 文件中添加 Notion API 配置：

```env
# .env.local
NOTION_ACCESS_TOKEN=your_notion_integration_token
NOTION_PAGE_ID=your_notion_page_id
```

### 2. 博客配置

确保 `blog.config.js` 中的 Notion 配置正确：

```javascript
// blog.config.js
module.exports = {
  // ... 其他配置
  NOTION_PAGE_ID: process.env.NOTION_PAGE_ID,
  NOTION_ACCESS_TOKEN: process.env.NOTION_ACCESS_TOKEN, // 可选
  // ... 其他配置
}
```

## 🎯 快速开始

### 1. 启动项目

```bash
npm run dev
# 或
yarn dev
```

### 2. 访问管理界面

打开浏览器访问：

```
http://localhost:3000/admin/batch-manager
```

### 3. 批量导出文档

1. 点击"批量导出"标签页
2. 点击"获取所有页面"按钮
3. 设置筛选条件（可选）
4. 选择要导出的页面
5. 点击"批量导出"下载 ZIP 文件

### 4. 批量上传文档

1. 点击"批量上传"标签页
2. 选择目标 Notion 数据库
3. 拖拽或选择 Markdown 文件
4. 等待文件验证完成
5. 点击"批量上传"开始处理

## 📝 支持的文件格式

### Front Matter 示例

```yaml
---
title: "文章标题"
date: "2023-12-01"
updated: "2023-12-05"
tags: ["JavaScript", "React", "Web开发"]
categories: ["技术"]
slug: "custom-url-slug"
status: "Published"
type: "Post"
summary: "这是文章摘要"
author: "作者名字"
cover: "https://example.com/cover.jpg"
---

# 文章标题

这里是文章内容...
```

### 支持的 Markdown 特性

- ✅ 标题 (H1-H6)
- ✅ 段落和文本格式
- ✅ 列表（有序/无序）
- ✅ 链接和图片
- ✅ 代码块和行内代码
- ✅ 引用块
- ✅ 表格
- ✅ 分隔线

## 🔧 API 接口

### 导出接口

```http
POST /api/export
Content-Type: application/json

{
  "action": "export-batch",
  "pageIds": ["page-id-1", "page-id-2"],
  "filterConfig": {
    "status": ["Published"],
    "type": ["Post"]
  }
}
```

### 上传接口

```http
POST /api/upload
Content-Type: application/json

{
  "action": "upload-batch",
  "files": [
    {
      "fileName": "article.md",
      "content": "# 文章内容..."
    }
  ],
  "databaseId": "notion-database-id"
}
```

## 🎨 界面预览

### 批量导出界面
- 📊 数据统计面板
- 🔍 多维度筛选器
- 📋 页面列表和选择
- ⚙️ 导出配置选项
- 📦 一键打包下载

### 批量上传界面
- 📁 拖拽上传区域
- ✅ 实时文件验证
- 📝 文件预览功能
- ⚙️ 上传配置选项
- 📊 上传进度追踪

## 🚨 常见问题

### Q: 上传失败怎么办？
**A**: 检查以下几点：
1. Notion API 权限是否正确
2. 文件 Front Matter 格式是否正确
3. 目标数据库是否存在
4. 文件大小是否超限

### Q: 导出的文件格式不对？
**A**: 确保：
1. 选择了正确的导出配置
2. 页面内容完整且可访问
3. 网络连接稳定

### Q: 如何自定义 Front Matter 映射？
**A**: 在上传配置中设置 `customPropertyMapping`：

```javascript
{
  customPropertyMapping: {
    "title": "Name",
    "tags": "Tags",
    "category": "Category"
  }
}
```

## 📚 更多文档

- 📖 [详细使用指南](./docs/batch-manager-guide.md)
- 🌐 [elog 项目](https://github.com/LetTTGACO/elog)
- 📝 [Notion API 文档](https://developers.notion.com/)
- 🎯 [Markdown 规范](https://commonmark.org/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

*参考 elog 项目设计，致力于提供最佳的文档管理体验* ✨ 