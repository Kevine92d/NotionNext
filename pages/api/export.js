import { NotionAPI } from 'notion-client'
import BLOG from '@/blog.config'
import { getDataFromCache, setDataToCache } from '@/lib/cache'
import { getAllPageIds } from '@/lib/notion/getAllPageIds'
import { getPageProperties } from '@/lib/notion/getPageProperties'
import { getPostBlocks } from '@/lib/notion/getPostBlocks'
import formatDate from '@/lib/utils/formatDate'
import { NotionToMarkdown } from 'notion-to-md'

const notion = new NotionAPI()

/**
 * 批量导出 Notion 页面为 Markdown 文档
 * 参考 elog 的设计思路，支持批量导出、过滤和转换
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { 
    action, 
    pageIds, 
    exportConfig = {},
    filterConfig = {} 
  } = req.body

  try {
    switch (action) {
      case 'export-batch':
        const result = await exportBatchToMarkdown(pageIds, exportConfig, filterConfig)
        return res.status(200).json(result)
      
      case 'get-all-pages':
        const allPages = await getAllPagesWithMeta()
        return res.status(200).json(allPages)
      
      case 'export-single':
        const singleResult = await exportSinglePageToMarkdown(req.body.pageId, exportConfig)
        return res.status(200).json(singleResult)
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Export API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    })
  }
}

/**
 * 获取所有页面及其元数据
 */
async function getAllPagesWithMeta() {
  const cacheKey = 'all-pages-meta'
  const cached = await getDataFromCache(cacheKey)
  
  if (cached) {
    return cached
  }

  const allPages = await getAllPageIds()
  const pagesWithMeta = []

  for (const pageId of allPages) {
    try {
      const properties = await getPageProperties(pageId)
      if (properties) {
        pagesWithMeta.push({
          id: pageId,
          title: properties.title || 'Untitled',
          type: properties.type || 'Page',
          status: properties.status || 'Published',
          category: properties.category || '',
          tags: properties.tags || [],
          date: properties.date || null,
          summary: properties.summary || '',
          slug: properties.slug || pageId
        })
      }
    } catch (error) {
      console.warn(`Failed to get properties for page ${pageId}:`, error.message)
    }
  }

  await setDataToCache(cacheKey, pagesWithMeta, 300) // 缓存5分钟
  return pagesWithMeta
}

/**
 * 批量导出为 Markdown
 */
async function exportBatchToMarkdown(pageIds, exportConfig, filterConfig) {
  const results = []
  const errors = []

  // 如果没有指定 pageIds，获取所有符合条件的页面
  if (!pageIds || pageIds.length === 0) {
    const allPages = await getAllPagesWithMeta()
    pageIds = filterPages(allPages, filterConfig).map(page => page.id)
  }

  for (const pageId of pageIds) {
    try {
      const result = await exportSinglePageToMarkdown(pageId, exportConfig)
      if (result.success) {
        results.push(result)
      } else {
        errors.push({ pageId, error: result.error })
      }
    } catch (error) {
      errors.push({ pageId, error: error.message })
    }
  }

  return {
    success: true,
    total: pageIds.length,
    exported: results.length,
    failed: errors.length,
    results,
    errors
  }
}

/**
 * 导出单个页面为 Markdown
 */
async function exportSinglePageToMarkdown(pageId, exportConfig = {}) {
  try {
    // 获取页面属性
    const properties = await getPageProperties(pageId)
    if (!properties) {
      return { success: false, error: 'Page not found or not accessible' }
    }

    // 获取页面内容块
    const blockMap = await getPostBlocks(pageId)
    if (!blockMap) {
      return { success: false, error: 'Failed to get page content' }
    }

    // 转换为 Markdown
    const markdown = await convertBlocksToMarkdown(blockMap, pageId, exportConfig)
    
    // 生成 Front Matter
    const frontMatter = generateFrontMatter(properties, exportConfig)
    
    // 组合最终的 Markdown 内容
    const fullMarkdown = frontMatter + '\n\n' + markdown

    return {
      success: true,
      pageId,
      title: properties.title || 'Untitled',
      slug: properties.slug || pageId,
      markdown: fullMarkdown,
      properties,
      meta: {
        wordCount: markdown.length,
        exportTime: new Date().toISOString()
      }
    }
  } catch (error) {
    return { 
      success: false, 
      pageId, 
      error: error.message 
    }
  }
}

/**
 * 将 Notion 块转换为 Markdown
 */
async function convertBlocksToMarkdown(blockMap, pageId, exportConfig) {
  try {
    // 使用 notion-to-md 库进行转换
    const n2m = new NotionToMarkdown({ notionAPI: notion })
    
    // 获取页面的所有块
    const blocks = blockMap.block || {}
    const pageBlock = blocks[pageId]
    
    if (!pageBlock || !pageBlock.value) {
      throw new Error('Invalid page block')
    }

    // 获取子块
    const childIds = pageBlock.value.content || []
    let markdown = ''

    for (const childId of childIds) {
      const childBlock = blocks[childId]
      if (childBlock && childBlock.value) {
        const blockMarkdown = await convertSingleBlockToMarkdown(childBlock.value, blocks, exportConfig)
        if (blockMarkdown) {
          markdown += blockMarkdown + '\n\n'
        }
      }
    }

    return markdown.trim()
  } catch (error) {
    console.error('Error converting blocks to markdown:', error)
    return ''
  }
}

/**
 * 转换单个块为 Markdown
 */
async function convertSingleBlockToMarkdown(block, allBlocks, exportConfig) {
  const type = block.type
  
  switch (type) {
    case 'text':
      return convertTextToMarkdown(block)
    case 'header':
      return `# ${getPlainText(block.properties?.title)}`
    case 'sub_header':
      return `## ${getPlainText(block.properties?.title)}`
    case 'sub_sub_header':
      return `### ${getPlainText(block.properties?.title)}`
    case 'bulleted_list':
      return `- ${getPlainText(block.properties?.title)}`
    case 'numbered_list':
      return `1. ${getPlainText(block.properties?.title)}`
    case 'code':
      const language = block.properties?.language?.[0]?.[0] || ''
      const code = getPlainText(block.properties?.title)
      return `\`\`\`${language}\n${code}\n\`\`\``
    case 'quote':
      return `> ${getPlainText(block.properties?.title)}`
    case 'divider':
      return '---'
    case 'image':
      return convertImageToMarkdown(block, exportConfig)
    default:
      return getPlainText(block.properties?.title) || ''
  }
}

/**
 * 转换文本块为 Markdown
 */
function convertTextToMarkdown(block) {
  const title = block.properties?.title
  if (!title) return ''
  
  return title.map(segment => {
    if (typeof segment === 'string') {
      return segment
    }
    
    const [text, formatting] = segment
    if (!formatting || formatting.length === 0) {
      return text
    }
    
    let result = text
    formatting.forEach(format => {
      const [type] = format
      switch (type) {
        case 'b': // bold
          result = `**${result}**`
          break
        case 'i': // italic
          result = `*${result}*`
          break
        case 'c': // code
          result = `\`${result}\``
          break
        case 's': // strikethrough
          result = `~~${result}~~`
          break
        case 'a': // link
          const url = format[1]
          result = `[${result}](${url})`
          break
      }
    })
    
    return result
  }).join('')
}

/**
 * 转换图片为 Markdown
 */
function convertImageToMarkdown(block, exportConfig) {
  const imageUrl = block.properties?.source?.[0]?.[0]
  const caption = getPlainText(block.properties?.caption)
  
  if (!imageUrl) return ''
  
  // 如果配置了图片处理，可以在这里添加图床上传逻辑
  const finalUrl = exportConfig.processImages ? processImageUrl(imageUrl) : imageUrl
  
  return caption ? `![${caption}](${finalUrl})` : `![](${finalUrl})`
}

/**
 * 处理图片URL（可扩展为上传到图床）
 */
function processImageUrl(url) {
  // 这里可以添加图床上传逻辑，类似 elog 的图床功能
  // 暂时返回原URL
  return url
}

/**
 * 获取纯文本内容
 */
function getPlainText(richText) {
  if (!richText) return ''
  
  return richText.map(segment => {
    if (typeof segment === 'string') {
      return segment
    }
    return segment[0]
  }).join('')
}

/**
 * 生成 Front Matter
 */
function generateFrontMatter(properties, exportConfig = {}) {
  const frontMatter = {
    title: properties.title || 'Untitled',
    date: properties.date?.start_date || formatDate(new Date(), BLOG.LANG),
    updated: properties.lastEditedTime || formatDate(new Date(), BLOG.LANG),
    tags: properties.tags || [],
    categories: properties.category ? [properties.category] : [],
    slug: properties.slug || properties.id,
    status: properties.status || 'Published',
    type: properties.type || 'Post'
  }

  // 添加自定义字段
  if (exportConfig.customFields) {
    Object.assign(frontMatter, exportConfig.customFields)
  }

  // 过滤空值
  Object.keys(frontMatter).forEach(key => {
    if (frontMatter[key] === null || frontMatter[key] === undefined || 
        (Array.isArray(frontMatter[key]) && frontMatter[key].length === 0)) {
      delete frontMatter[key]
    }
  })

  // 生成 YAML Front Matter
  const yamlContent = Object.entries(frontMatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) return null
        return `${key}:\n${value.map(item => `  - ${item}`).join('\n')}`
      }
      return `${key}: ${typeof value === 'string' ? `"${value}"` : value}`
    })
    .filter(Boolean)
    .join('\n')

  return `---\n${yamlContent}\n---`
}

/**
 * 根据条件过滤页面
 */
function filterPages(pages, filterConfig) {
  if (!filterConfig || Object.keys(filterConfig).length === 0) {
    return pages
  }

  return pages.filter(page => {
    // 按状态过滤
    if (filterConfig.status && page.status !== filterConfig.status) {
      return false
    }

    // 按类型过滤
    if (filterConfig.type && page.type !== filterConfig.type) {
      return false
    }

    // 按分类过滤
    if (filterConfig.category && page.category !== filterConfig.category) {
      return false
    }

    // 按标签过滤
    if (filterConfig.tags && filterConfig.tags.length > 0) {
      if (!page.tags || page.tags.length === 0) {
        return false
      }
      const hasMatchingTag = filterConfig.tags.some(tag => page.tags.includes(tag))
      if (!hasMatchingTag) {
        return false
      }
    }

    // 按日期范围过滤
    if (filterConfig.dateRange) {
      const pageDate = new Date(page.date?.start_date || page.date)
      const startDate = filterConfig.dateRange.start ? new Date(filterConfig.dateRange.start) : null
      const endDate = filterConfig.dateRange.end ? new Date(filterConfig.dateRange.end) : null
      
      if (startDate && pageDate < startDate) {
        return false
      }
      if (endDate && pageDate > endDate) {
        return false
      }
    }

    return true
  })
} 