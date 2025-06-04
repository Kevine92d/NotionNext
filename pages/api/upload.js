import { Client } from '@notionhq/client'
import BLOG from '@/blog.config'
import { getDataFromCache, setDataToCache } from '@/lib/cache'
import matter from 'gray-matter'
import { markdownToBlocks } from '@notion-hq/client'

// 初始化 Notion 客户端
const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY
})

/**
 * 批量上传 Markdown 文档到 Notion
 * 参考 elog 的设计思路，支持批量上传、解析 Front Matter 和转换 Markdown
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { 
    action, 
    files, 
    uploadConfig = {},
    databaseId 
  } = req.body

  try {
    switch (action) {
      case 'upload-batch':
        const result = await uploadBatchMarkdownFiles(files, databaseId, uploadConfig)
        return res.status(200).json(result)
      
      case 'upload-single':
        const singleResult = await uploadSingleMarkdownFile(req.body.content, req.body.fileName, databaseId, uploadConfig)
        return res.status(200).json(singleResult)
      
      case 'validate-files':
        const validation = await validateMarkdownFiles(files)
        return res.status(200).json(validation)
      
      case 'get-databases':
        const databases = await getUserDatabases()
        return res.status(200).json(databases)
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Upload API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    })
  }
}

/**
 * 批量上传 Markdown 文件
 */
async function uploadBatchMarkdownFiles(files, databaseId, uploadConfig) {
  const results = []
  const errors = []

  if (!files || files.length === 0) {
    return { success: false, error: 'No files provided' }
  }

  if (!databaseId) {
    return { success: false, error: 'Database ID is required' }
  }

  for (const file of files) {
    try {
      const result = await uploadSingleMarkdownFile(file.content, file.fileName, databaseId, uploadConfig)
      if (result.success) {
        results.push(result)
      } else {
        errors.push({ fileName: file.fileName, error: result.error })
      }
    } catch (error) {
      errors.push({ fileName: file.fileName, error: error.message })
    }
  }

  return {
    success: true,
    total: files.length,
    uploaded: results.length,
    failed: errors.length,
    results,
    errors
  }
}

/**
 * 上传单个 Markdown 文件
 */
async function uploadSingleMarkdownFile(content, fileName, databaseId, uploadConfig = {}) {
  try {
    // 解析 Markdown 和 Front Matter
    const parsed = matter(content)
    const { data: frontMatter, content: markdownContent } = parsed

    // 验证必要字段
    if (!frontMatter.title && !fileName) {
      return { success: false, error: 'Title is required (from front matter or filename)' }
    }

    // 生成页面属性
    const pageProperties = generatePageProperties(frontMatter, fileName, uploadConfig)

    // 转换 Markdown 为 Notion 块
    const blocks = await convertMarkdownToNotionBlocks(markdownContent, uploadConfig)

    // 创建页面
    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: pageProperties,
      children: blocks
    })

    return {
      success: true,
      fileName,
      pageId: page.id,
      title: frontMatter.title || fileName,
      url: page.url,
      meta: {
        wordCount: markdownContent.length,
        uploadTime: new Date().toISOString(),
        blocksCount: blocks.length
      }
    }
  } catch (error) {
    return { 
      success: false, 
      fileName, 
      error: error.message 
    }
  }
}

/**
 * 生成页面属性
 */
function generatePageProperties(frontMatter, fileName, uploadConfig) {
  const properties = {}

  // 标题
  const title = frontMatter.title || fileName.replace(/\.md$/, '')
  properties.Name = {
    title: [
      {
        text: {
          content: title
        }
      }
    ]
  }

  // 标签
  if (frontMatter.tags && Array.isArray(frontMatter.tags)) {
    properties.Tags = {
      multi_select: frontMatter.tags.map(tag => ({ name: tag }))
    }
  }

  // 分类
  if (frontMatter.category || frontMatter.categories) {
    const category = frontMatter.category || (Array.isArray(frontMatter.categories) ? frontMatter.categories[0] : frontMatter.categories)
    if (category) {
      properties.Category = {
        select: { name: category }
      }
    }
  }

  // 状态
  if (frontMatter.status) {
    properties.Status = {
      select: { name: frontMatter.status }
    }
  } else {
    properties.Status = {
      select: { name: 'Published' }
    }
  }

  // 日期
  if (frontMatter.date) {
    properties.Date = {
      date: {
        start: new Date(frontMatter.date).toISOString().split('T')[0]
      }
    }
  }

  // 更新时间
  if (frontMatter.updated) {
    properties.Updated = {
      date: {
        start: new Date(frontMatter.updated).toISOString().split('T')[0]
      }
    }
  }

  // URL/Slug
  if (frontMatter.slug) {
    properties.Slug = {
      rich_text: [
        {
          text: {
            content: frontMatter.slug
          }
        }
      ]
    }
  }

  // 摘要
  if (frontMatter.summary || frontMatter.description) {
    properties.Summary = {
      rich_text: [
        {
          text: {
            content: frontMatter.summary || frontMatter.description
          }
        }
      ]
    }
  }

  // 自定义属性
  if (uploadConfig.customPropertyMapping) {
    Object.entries(uploadConfig.customPropertyMapping).forEach(([frontMatterKey, notionProperty]) => {
      if (frontMatter[frontMatterKey]) {
        properties[notionProperty.name] = generatePropertyValue(frontMatter[frontMatterKey], notionProperty.type)
      }
    })
  }

  return properties
}

/**
 * 生成属性值
 */
function generatePropertyValue(value, type) {
  switch (type) {
    case 'title':
      return {
        title: [{ text: { content: String(value) } }]
      }
    case 'rich_text':
      return {
        rich_text: [{ text: { content: String(value) } }]
      }
    case 'number':
      return {
        number: Number(value)
      }
    case 'select':
      return {
        select: { name: String(value) }
      }
    case 'multi_select':
      const values = Array.isArray(value) ? value : [value]
      return {
        multi_select: values.map(v => ({ name: String(v) }))
      }
    case 'date':
      return {
        date: {
          start: new Date(value).toISOString().split('T')[0]
        }
      }
    case 'checkbox':
      return {
        checkbox: Boolean(value)
      }
    case 'url':
      return {
        url: String(value)
      }
    default:
      return {
        rich_text: [{ text: { content: String(value) } }]
      }
  }
}

/**
 * 转换 Markdown 为 Notion 块
 */
async function convertMarkdownToNotionBlocks(markdownContent, uploadConfig) {
  const blocks = []
  
  // 简单的 Markdown 解析
  const lines = markdownContent.split('\n')
  let currentBlock = null
  let codeBlockContent = []
  let inCodeBlock = false
  let codeLanguage = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 处理代码块
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // 结束代码块
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: codeBlockContent.join('\n')
                }
              }
            ],
            language: codeLanguage || 'plain text'
          }
        })
        codeBlockContent = []
        inCodeBlock = false
        codeLanguage = ''
      } else {
        // 开始代码块
        inCodeBlock = true
        codeLanguage = line.substring(3).trim() || 'plain text'
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    // 处理标题
    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: parseRichText(line.substring(2))
        }
      })
    } else if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: parseRichText(line.substring(3))
        }
      })
    } else if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: parseRichText(line.substring(4))
        }
      })
    }
    // 处理无序列表
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: parseRichText(line.substring(2))
        }
      })
    }
    // 处理有序列表
    else if (/^\d+\.\s/.test(line)) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: parseRichText(line.replace(/^\d+\.\s/, ''))
        }
      })
    }
    // 处理引用
    else if (line.startsWith('> ')) {
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: parseRichText(line.substring(2))
        }
      })
    }
    // 处理分割线
    else if (line.trim() === '---' || line.trim() === '***') {
      blocks.push({
        object: 'block',
        type: 'divider',
        divider: {}
      })
    }
    // 处理图片
    else if (line.match(/!\[.*\]\(.*\)/)) {
      const match = line.match(/!\[(.*)\]\((.*)\)/)
      if (match) {
        const [, alt, url] = match
        blocks.push({
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: {
              url: url
            },
            caption: alt ? [{ type: 'text', text: { content: alt } }] : []
          }
        })
      }
    }
    // 处理普通段落
    else if (line.trim() !== '') {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: parseRichText(line)
        }
      })
    }
  }

  return blocks
}

/**
 * 解析富文本格式
 */
function parseRichText(text) {
  const richText = []
  
  // 简单的格式处理
  const segments = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g)
  
  segments.forEach(segment => {
    if (!segment) return
    
    // 粗体
    if (segment.startsWith('**') && segment.endsWith('**')) {
      richText.push({
        type: 'text',
        text: {
          content: segment.slice(2, -2)
        },
        annotations: {
          bold: true
        }
      })
    }
    // 斜体
    else if (segment.startsWith('*') && segment.endsWith('*') && !segment.startsWith('**')) {
      richText.push({
        type: 'text',
        text: {
          content: segment.slice(1, -1)
        },
        annotations: {
          italic: true
        }
      })
    }
    // 代码
    else if (segment.startsWith('`') && segment.endsWith('`')) {
      richText.push({
        type: 'text',
        text: {
          content: segment.slice(1, -1)
        },
        annotations: {
          code: true
        }
      })
    }
    // 链接
    else if (segment.match(/\[.*?\]\(.*?\)/)) {
      const match = segment.match(/\[(.*?)\]\((.*?)\)/)
      if (match) {
        const [, text, url] = match
        richText.push({
          type: 'text',
          text: {
            content: text,
            link: {
              url: url
            }
          }
        })
      }
    }
    // 普通文本
    else {
      richText.push({
        type: 'text',
        text: {
          content: segment
        }
      })
    }
  })

  return richText.length > 0 ? richText : [{ type: 'text', text: { content: text } }]
}

/**
 * 验证 Markdown 文件
 */
async function validateMarkdownFiles(files) {
  const validationResults = []

  for (const file of files) {
    try {
      const parsed = matter(file.content)
      const validation = {
        fileName: file.fileName,
        valid: true,
        issues: [],
        frontMatter: parsed.data,
        contentLength: parsed.content.length
      }

      // 检查标题
      if (!parsed.data.title && !file.fileName) {
        validation.issues.push('No title found in front matter or filename')
      }

      // 检查内容
      if (!parsed.content.trim()) {
        validation.issues.push('Empty content')
      }

      // 检查日期格式
      if (parsed.data.date && isNaN(new Date(parsed.data.date))) {
        validation.issues.push('Invalid date format')
      }

      if (validation.issues.length > 0) {
        validation.valid = false
      }

      validationResults.push(validation)
    } catch (error) {
      validationResults.push({
        fileName: file.fileName,
        valid: false,
        issues: [`Parse error: ${error.message}`]
      })
    }
  }

  return {
    totalFiles: files.length,
    validFiles: validationResults.filter(r => r.valid).length,
    invalidFiles: validationResults.filter(r => !r.valid).length,
    results: validationResults
  }
}

/**
 * 获取用户的数据库列表
 */
async function getUserDatabases() {
  try {
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      }
    })

    return {
      success: true,
      databases: response.results.map(db => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled',
        url: db.url,
        properties: Object.keys(db.properties || {})
      }))
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
} 