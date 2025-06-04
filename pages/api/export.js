import { NotionAPI } from 'notion-client'
import BLOG from '@/blog.config'
import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'
import { getGlobalData } from '@/lib/db/getSiteData'
import { getPageProperties } from '@/lib/notion/getPageProperties'
import { getPostBlocks } from '@/lib/notion/getPostBlocks'
import formatDate from '@/lib/utils/formatDate'
import notionAPI from '@/lib/notion/getNotionAPI'

/**
 * 批量导出 Notion 页面为 Markdown 文档
 * 参考 elog 的设计思路，支持批量导出、过滤和转换
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const { 
    action, 
    pageIds, 
    exportConfig = {},
    filterConfig = {} 
  } = req.body

  try {
    switch (action) {
      case 'get-all-pages':
        console.log('📥 [EXPORT] Fetching all pages...', { timestamp: new Date().toISOString() })
        const allPages = await getAllPagesWithMeta()
        console.log('✅ [EXPORT] Pages fetched successfully', { 
          count: allPages.length, 
          timestamp: new Date().toISOString() 
        })
        return res.status(200).json(allPages)
      
      case 'export-batch':
        console.log('📤 [BATCH EXPORT START]', {
          pageIds: pageIds?.length,
          exportConfig,
          timestamp: new Date().toISOString()
        })
        const batchResults = await exportBatchToMarkdown(pageIds, exportConfig, filterConfig)
        console.log('✅ [BATCH EXPORT COMPLETE]', {
          exported: batchResults.exported,
          failed: batchResults.failed,
          timestamp: new Date().toISOString()
        })
        return res.status(200).json(batchResults)
      
      case 'export-single':
        console.log('📤 [SINGLE EXPORT]', { pageId, timestamp: new Date().toISOString() })
        const singleResult = await exportSinglePageToMarkdown(req.body.pageId, exportConfig)
        if (singleResult.success) {
          console.log('✅ [SINGLE EXPORT SUCCESS]', { 
            pageId, 
            title: singleResult.title,
            timestamp: new Date().toISOString() 
          })
        } else {
          console.log('❌ [SINGLE EXPORT ERROR]', { 
            pageId, 
            error: singleResult.error,
            timestamp: new Date().toISOString() 
          })
        }
        return res.status(200).json(singleResult)
      
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid action' 
        })
    }
  } catch (error) {
    console.error('Export API error:', error)
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    })
  }
}

/**
 * 获取所有页面及其元数据 - 使用原始项目的数据获取方式
 */
async function getAllPagesWithMeta() {
  try {
    const cacheKey = 'batch-export-pages-meta'
    const cached = await getDataFromCache(cacheKey)
    
    if (cached) {
      return cached // 直接返回数组
    }

    // 使用原始项目的getSiteData方法
    const siteData = await getGlobalData({
      pageId: BLOG.NOTION_PAGE_ID,
      from: 'batch-export-api'
    })

    if (!siteData.allPages || !Array.isArray(siteData.allPages)) {
      console.warn('No allPages found in site data')
      return []
    }

    // 转换为导出管理器需要的格式
    const pagesWithMeta = siteData.allPages
      .filter(page => page && page.id) // 过滤无效页面
      .slice(0, 100) // 限制数量
      .map(page => ({
        id: page.id,
        title: page.title || 'Untitled',
        type: page.type || 'Post',
        status: page.status || 'Published',
        category: page.category || '',
        tags: page.tags || [],
        date: page.date?.start_date || page.publishDate || page.lastEditedDate || null,
        summary: page.summary || '',
        slug: page.slug || page.id
      }))

    await setDataToCache(cacheKey, pagesWithMeta, 300) // 缓存5分钟
    return pagesWithMeta // 直接返回数组
  } catch (error) {
    console.error('Error getting pages meta:', error)
    return [] // 返回空数组而不是错误对象
  }
}

/**
 * 批量导出为 Markdown
 */
async function exportBatchToMarkdown(pageIds, exportConfig, filterConfig) {
  const results = []
  const errors = []

  try {
    // 如果没有指定 pageIds，获取所有符合条件的页面
    if (!pageIds || pageIds.length === 0) {
      const allPagesResult = await getAllPagesWithMeta()
      if (allPagesResult.length > 0) {
        const filteredPages = filterPages(allPagesResult, filterConfig)
        pageIds = filteredPages.map(page => page.id)
      } else {
        return { success: false, message: 'Failed to get pages' }
      }
    }

    for (const pageId of pageIds.slice(0, 20)) { // 限制导出数量
      try {
        const result = await exportSinglePageToMarkdown(pageId, exportConfig)
        if (result.success) {
          results.push(result)
        } else {
          errors.push({ pageId, error: result.message })
        }
      } catch (error) {
        errors.push({ pageId, error: error.message })
      }
    }

    return {
      success: true,
      message: `Exported ${results.length} pages`,
      total: pageIds.length,
      exported: results.length,
      failed: errors.length,
      results,
      errors
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      results: [],
      errors: []
    }
  }
}

/**
 * 导出单个页面为 Markdown（简化版本）
 */
async function exportSinglePageToMarkdown(pageId, exportConfig = {}) {
  try {
    // 获取页面属性
    const properties = await getPageProperties(pageId)
    if (!properties) {
      return { success: false, message: 'Page not found or not accessible' }
    }

    // 获取页面内容块
    const blockMap = await getPostBlocks(pageId)
    if (!blockMap) {
      return { success: false, message: 'Failed to get page content' }
    }

    // 简化的 Markdown 转换
    const markdown = convertBlocksToSimpleMarkdown(blockMap, pageId)
    
    // 生成 Front Matter
    const frontMatter = generateFrontMatter(properties, exportConfig)
    
    // 组合最终的 Markdown 内容
    const fullMarkdown = frontMatter + '\n\n' + markdown

    return {
      success: true,
      pageId,
      title: properties.title || 'Untitled',
      slug: properties.slug || pageId,
      fileName: `${properties.slug || pageId}.md`,
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
      message: error.message 
    }
  }
}

/**
 * 简化的块转换为 Markdown
 */
function convertBlocksToSimpleMarkdown(blockMap, pageId) {
  try {
    const blocks = blockMap.block || {}
    const pageBlock = blocks[pageId]
    
    if (!pageBlock || !pageBlock.value) {
      return '# ' + (pageBlock?.value?.properties?.title?.[0]?.[0] || 'Untitled') + '\n\nContent could not be exported.'
    }

    let markdown = ''
    const title = pageBlock.value.properties?.title?.[0]?.[0]
    
    if (title) {
      markdown += `# ${title}\n\n`
    }

    // 简单的内容提取
    const content = pageBlock.value.content || []
    for (const contentId of content.slice(0, 50)) { // 限制块数量
      const block = blocks[contentId]
      if (block && block.value) {
        const blockText = extractTextFromBlock(block.value)
        if (blockText) {
          markdown += blockText + '\n\n'
        }
      }
    }

    return markdown || 'No content available.'
  } catch (error) {
    console.error('Error converting blocks:', error)
    return 'Error extracting content: ' + error.message
  }
}

/**
 * 从块中提取文本
 */
function extractTextFromBlock(block) {
  if (!block) return ''
  
  const type = block.type
  const properties = block.properties || {}
  
  let text = ''
  
  // 提取标题文本
  if (properties.title && Array.isArray(properties.title)) {
    text = properties.title.map(item => item[0] || '').join('')
  }
  
  // 根据块类型添加格式
  switch (type) {
    case 'header':
      return `# ${text}`
    case 'sub_header':
      return `## ${text}`
    case 'sub_sub_header':
      return `### ${text}`
    case 'text':
      return text
    case 'bulleted_list':
      return `- ${text}`
    case 'numbered_list':
      return `1. ${text}`
    case 'quote':
      return `> ${text}`
    case 'code':
      return `\`\`\`\n${text}\n\`\`\``
    case 'divider':
      return '---'
    default:
      return text
  }
}

/**
 * 生成 Front Matter
 */
function generateFrontMatter(properties, exportConfig = {}) {
  const frontMatter = {
    title: properties.title || 'Untitled',
    date: properties.date || new Date().toISOString().split('T')[0],
    tags: properties.tags || [],
    categories: properties.category ? [properties.category] : [],
    slug: properties.slug || '',
    status: properties.status || 'Published',
    type: properties.type || 'Post'
  }

  // 添加可选字段
  if (properties.summary) frontMatter.summary = properties.summary
  if (properties.updated) frontMatter.updated = properties.updated

  // 过滤空值
  const filteredFrontMatter = Object.fromEntries(
    Object.entries(frontMatter).filter(([key, value]) => 
      value !== null && value !== undefined && value !== '' && 
      !(Array.isArray(value) && value.length === 0)
    )
  )

  // 转换为 YAML
  const yamlContent = Object.entries(filteredFrontMatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`
      }
      return `${key}: "${value}"`
    })
    .join('\n')

  return `---\n${yamlContent}\n---`
}

/**
 * 过滤页面
 */
function filterPages(pages, filterConfig) {
  if (!filterConfig || Object.keys(filterConfig).length === 0) {
    return pages
  }

  return pages.filter(page => {
    // 状态过滤
    if (filterConfig.status && filterConfig.status.length > 0) {
      if (!filterConfig.status.includes(page.status)) return false
    }

    // 类型过滤
    if (filterConfig.type && filterConfig.type.length > 0) {
      if (!filterConfig.type.includes(page.type)) return false
    }

    // 分类过滤
    if (filterConfig.category && filterConfig.category.length > 0) {
      if (!filterConfig.category.includes(page.category)) return false
    }

    // 标签过滤
    if (filterConfig.tags && filterConfig.tags.length > 0) {
      const hasMatchingTag = filterConfig.tags.some(tag => 
        page.tags && page.tags.includes(tag)
      )
      if (!hasMatchingTag) return false
    }

    // 日期范围过滤
    if (filterConfig.dateRange) {
      const pageDate = new Date(page.date)
      if (filterConfig.dateRange.start && pageDate < new Date(filterConfig.dateRange.start)) {
        return false
      }
      if (filterConfig.dateRange.end && pageDate > new Date(filterConfig.dateRange.end)) {
        return false
      }
    }

    return true
  })
} 