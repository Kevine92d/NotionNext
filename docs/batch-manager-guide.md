# 批量文档管理系统使用指南

## 概述

本系统参考 [elog](https://github.com/LetTTGACO/elog) 项目的设计理念，为 NotionNext 博客系统提供了强大的批量文档管理功能，支持 Markdown 文档的批量导出和上传。

## 功能特性

### 🚀 核心功能

- **批量导出**: 从 Notion 数据库批量导出文档为 Markdown 格式
- **批量上传**: 将本地 Markdown 文件批量上传到 Notion 数据库
- **智能筛选**: 支持按状态、类型、分类、标签、日期等条件筛选
- **格式转换**: 自动处理 Notion 块与 Markdown 语法的双向转换
- **文件验证**: 上传前自动验证文件格式和内容完整性
- **预览功能**: 支持文档内容预览和编辑前检查

### 📦 参考 elog 的设计特点

- **跨平台兼容**: 生成的 Markdown 文件兼容多种静态博客系统
- **Front Matter 支持**: 完整支持 YAML Front Matter 格式
- **批量处理**: 高效的批量操作，支持大量文档处理
- **错误处理**: 详细的错误信息和处理建议
- **进度追踪**: 实时显示操作进度和状态

## 快速开始

### 1. 访问管理页面

访问 `/admin/batch-manager` 进入批量文档管理界面。

```
http://your-domain.com/admin/batch-manager
```

### 2. 配置 Notion API

确保在 `blog.config.js` 中正确配置了 Notion 相关参数：

```javascript
// blog.config.js
NOTION_PAGE_ID: 'your-notion-page-id',
NOTION_ACCESS_TOKEN: 'your-notion-token', // 可选，用于私有内容
```

## 批量导出功能

### 基本操作步骤

1. **选择导出模式**
   - 切换到"批量导出"标签页
   - 点击"获取所有页面"按钮加载数据

2. **设置筛选条件**
   ```javascript
   // 支持的筛选条件
   {
     status: ['Published', 'Draft'],
     type: ['Post', 'Page'],
     category: ['技术', '生活'],
     tags: ['JavaScript', 'React'],
     dateRange: {
       start: '2023-01-01',
       end: '2023-12-31'
     }
   }
   ```

3. **配置导出选项**
   - 包含图片资源
   - 使用自定义文件名格式
   - 生成目录结构
   - 压缩输出文件

4. **执行导出**
   - 选择要导出的页面
   - 点击"批量导出"按钮
   - 系统将生成 ZIP 文件供下载

### 导出文件格式

导出的 Markdown 文件包含完整的 Front Matter：

```markdown
---
title: "文章标题"
date: "2023-12-01"
updated: "2023-12-05"
tags: ["JavaScript", "React"]
categories: ["技术"]
slug: "article-slug"
status: "Published"
type: "Post"
summary: "文章摘要"
---

# 文章标题

这里是文章内容...
```

## 批量上传功能

### 基本操作步骤

1. **选择目标数据库**
   - 切换到"批量上传"标签页
   - 从下拉列表中选择 Notion 数据库
   - 或点击"刷新"获取最新数据库列表

2. **上传文件**
   - **拖拽上传**: 直接将 `.md` 文件拖拽到上传区域
   - **文件选择**: 点击"选择文件"按钮选择文件

3. **文件验证**
   - 系统自动验证文件格式
   - 检查 Front Matter 语法
   - 显示验证结果摘要

4. **配置上传选项**
   ```javascript
   {
     overwriteExisting: false,  // 是否覆盖已存在页面
     skipInvalid: true,         // 跳过无效文件
     customPropertyMapping: {}  // 自定义属性映射
   }
   ```

5. **执行上传**
   - 预览文件列表和验证状态
   - 点击"批量上传"开始处理
   - 查看上传结果和错误报告

### 支持的 Front Matter 格式

```yaml
---
title: "必需：文章标题"
date: "2023-12-01"              # 发布日期
updated: "2023-12-05"           # 更新日期
tags: ["tag1", "tag2"]          # 标签数组
categories: ["category"]        # 分类数组
slug: "custom-slug"             # 自定义 URL slug
status: "Published"             # 状态：Published/Draft
type: "Post"                    # 类型：Post/Page
summary: "文章摘要"             # 文章摘要
author: "作者名"                # 作者
cover: "image-url"              # 封面图片
---
```

## 高级功能

### 1. 自定义筛选器

```javascript
// 复杂筛选示例
const filterConfig = {
  status: ['Published'],
  type: ['Post'],
  dateRange: {
    start: '2023-01-01',
    end: '2023-12-31'
  },
  customFilters: {
    hasImages: true,
    minWordCount: 500,
    tagCount: { min: 1, max: 5 }
  }
}
```

### 2. 批量编辑 Front Matter

```javascript
// 批量修改属性
const batchEdit = {
  addTags: ['新标签'],
  removeTags: ['旧标签'],
  updateCategory: '新分类',
  setStatus: 'Published'
}
```

### 3. 自定义导出模板

```javascript
// 自定义 Front Matter 模板
const frontMatterTemplate = {
  title: '${title}',
  date: '${date}',
  permalink: '/posts/${slug}/',
  tags: '${tags}',
  categories: '${categories}'
}
```

## API 接口

### 导出 API

```javascript
// POST /api/export
{
  "action": "export-batch",
  "pageIds": ["page-id-1", "page-id-2"],
  "filterConfig": { /* 筛选配置 */ },
  "exportConfig": { /* 导出配置 */ }
}
```

### 上传 API

```javascript
// POST /api/upload
{
  "action": "upload-batch",
  "files": [
    {
      "fileName": "article.md",
      "content": "# 文章内容..."
    }
  ],
  "databaseId": "notion-database-id",
  "uploadConfig": { /* 上传配置 */ }
}
```

## 错误处理

### 常见错误及解决方案

1. **Notion API 限制**
   ```
   错误：Request rate limited
   解决：降低请求频率，启用请求队列
   ```

2. **文件格式错误**
   ```
   错误：Invalid Front Matter syntax
   解决：检查 YAML 语法，确保正确的缩进和格式
   ```

3. **权限不足**
   ```
   错误：Access denied to database
   解决：检查 Notion 集成权限，确保有数据库访问权限
   ```

4. **文件大小限制**
   ```
   错误：File size exceeds limit
   解决：分割大文件或压缩图片资源
   ```

## 最佳实践

### 1. 导出最佳实践

- **分批导出**: 大量文档建议分批次导出，避免超时
- **筛选优化**: 使用精确的筛选条件，减少不必要的数据传输
- **格式统一**: 保持 Front Matter 格式的一致性
- **备份策略**: 定期导出作为内容备份

### 2. 上传最佳实践

- **文件准备**: 上传前确保 Markdown 文件格式正确
- **批量大小**: 单次上传建议不超过 50 个文件
- **错误处理**: 记录并处理上传失败的文件
- **验证机制**: 利用验证功能提前发现问题

### 3. 性能优化

- **缓存利用**: 合理使用缓存减少 API 调用
- **并发控制**: 控制并发请求数量，避免触发限制
- **进度监控**: 实时监控操作进度，及时处理异常
- **资源管理**: 合理管理内存和文件资源

## 与 elog 的对比

| 功能 | NotionNext 批量管理器 | elog |
|------|---------------------|------|
| 平台支持 | Notion ↔ Markdown | 多平台支持 |
| 批量操作 | ✅ 完整支持 | ✅ 完整支持 |
| UI 界面 | 集成式 Web 界面 | CLI + 配置文件 |
| 文件验证 | 实时验证 | 配置验证 |
| 错误处理 | 详细错误信息 | 日志输出 |
| 自定义配置 | Web 界面配置 | 配置文件 |

## 故障排除

### 环境检查

1. **Node.js 版本**: 确保使用 Node.js 14+ 版本
2. **依赖安装**: 检查相关依赖是否正确安装
3. **API 配置**: 验证 Notion API 配置是否正确
4. **网络连接**: 确保能正常访问 Notion API

### 调试模式

启用调试模式获取详细日志：

```javascript
// 在组件中启用调试
const DEBUG_MODE = process.env.NODE_ENV === 'development'

if (DEBUG_MODE) {
  console.log('Debug info:', debugInfo)
}
```

## 更新日志

### v1.0.0 (2023-12-01)
- 初始版本发布
- 基础批量导出功能
- 基础批量上传功能
- Web 管理界面

### 计划功能
- [ ] 增量同步支持
- [ ] 多数据库同时操作
- [ ] 自定义转换规则
- [ ] 插件系统支持
- [ ] 定时任务功能

## 参考资源

- [elog 项目](https://github.com/LetTTGACO/elog) - 开放式跨平台博客解决方案
- [Notion API 文档](https://developers.notion.com/)
- [Markdown 规范](https://commonmark.org/)
- [YAML Front Matter](https://jekyllrb.com/docs/front-matter/)

## 支持

如遇到问题，请：
1. 查看本文档的故障排除部分
2. 检查 GitHub Issues
3. 提交新的 Issue 并提供详细信息

---

*该文档基于 NotionNext 批量文档管理系统 v1.0.0 编写，参考了 elog 项目的设计理念和最佳实践。* 