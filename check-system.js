const fs = require('fs')
const path = require('path')

console.log('=== NotionNext 批量管理系统诊断 ===\n')

// 1. 检查关键文件是否存在
const requiredFiles = [
  'pages/admin/batch-manager.js',
  'components/BatchExportManager.js', 
  'components/BatchUploadManager.js',
  'components/ErrorBoundary.js',
  'pages/api/export.js',
  'pages/api/upload.js',
  'blog.config.js',
  'package.json'
]

console.log('1. 检查关键文件:')
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file)
  console.log(`${exists ? '✅' : '❌'} ${file}`)
})

// 2. 检查package.json中的依赖
console.log('\n2. 检查关键依赖:')
const packageJson = require('./package.json')
const requiredDeps = [
  'gray-matter',
  'js-yaml', 
  'jszip',
  'file-saver',
  'turndown',
  'turndown-plugin-gfm'
]

requiredDeps.forEach(dep => {
  const exists = packageJson.dependencies[dep] || packageJson.devDependencies[dep]
  console.log(`${exists ? '✅' : '❌'} ${dep}: ${exists || 'Not found'}`)
})

// 3. 检查blog.config.js
console.log('\n3. 检查配置:')
const BLOG = require('./blog.config.js')
console.log(`✅ NOTION_PAGE_ID: ${BLOG.NOTION_PAGE_ID}`)
console.log(`✅ THEME: ${BLOG.THEME}`)
console.log(`✅ LANG: ${BLOG.LANG}`)

// 4. 检查组件导入
console.log('\n4. 检查组件导入:')
try {
  require('./lib/utils')
  console.log('✅ lib/utils 模块')
} catch (e) {
  console.log('❌ lib/utils 模块:', e.message)
}

try {
  require('./lib/config')
  console.log('✅ lib/config 模块')
} catch (e) {
  console.log('❌ lib/config 模块:', e.message)
}

console.log('\n=== 诊断完成 ===')
console.log('如果所有项目都是 ✅，说明系统配置正确')
console.log('如果有 ❌ 项目，请检查对应的文件或依赖') 