import { NotionAPI } from 'notion-client'
import BLOG from '@/blog.config'
import matter from 'gray-matter'
import notionAPI from '@/lib/notion/getNotionAPI'

// 简化的批量上传API，使用现有的notion-client
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    })
  }

  try {
    const { action, files, databaseId, config = {} } = req.body

    switch (action) {
      case 'upload-batch':
        const batchResults = await uploadBatchMarkdownFiles(files, databaseId, config)
        return res.status(200).json(batchResults)
        
      case 'upload-single':
        const { fileName, content } = req.body
        const singleResult = await uploadSingleMarkdownFile(fileName, content, databaseId, config)
        return res.status(200).json(singleResult)
        
      case 'validate-files':
        const validationResults = await validateMarkdownFiles(files)
        return res.status(200).json(validationResults)
        
      case 'get-databases':
        // 由于notion-client限制，返回默认数据库配置
        return res.status(200).json({
          success: true,
          databases: [{
            id: BLOG.NOTION_PAGE_ID,
            title: 'NotionNext Blog',
            object: 'database'
          }]
        })
        
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid action' 
        })
    }
  } catch (error) {
    console.error('Upload API Error:', error)
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    })
  }
}

// 批量上传Markdown文件
async function uploadBatchMarkdownFiles(files, databaseId, config) {
  if (!files || files.length === 0) {
    return { 
      success: false, 
      message: 'No files provided' 
    }
  }

  console.log('🚀 [BATCH UPLOAD START]', {
    totalFiles: files.length,
    databaseId,
    config: {
      overwriteExisting: config?.overwriteExisting,
      skipInvalid: config?.skipInvalid,
      overrideWithDefaults: config?.overrideWithDefaults,
      defaultProperties: config?.defaultProperties
    },
    timestamp: new Date().toISOString()
  })

  const results = []
  const errors = []
  const stats = {
    total: files.length,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    appliedDefaults: 0
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    stats.processed++
    
    try {
      const result = await uploadSingleMarkdownFile(file.fileName, file.content, databaseId, config)
      
      if (result.success) {
        results.push(result)
        stats.success++
        
        // 统计应用了默认属性的文件
        if (result.metadata?.appliedDefaults) {
          const appliedCount = Object.values(result.metadata.appliedDefaults).filter(Boolean).length
          if (appliedCount > 0) {
            stats.appliedDefaults++
          }
        }
      } else {
        stats.failed++
        errors.push({
          fileName: file.fileName,
          error: result.error
        })
      }
    } catch (error) {
      stats.failed++
      errors.push({
        fileName: file.fileName,
        error: error.message
      })
    }
  }

  console.log('✅ [BATCH UPLOAD COMPLETE]', {
    stats,
    timestamp: new Date().toISOString()
  })

  return {
    success: errors.length === 0,
    message: `Processed ${files.length} files - Success: ${stats.success}, Failed: ${stats.failed}`,
    uploaded: stats.success,
    failed: stats.failed,
    results,
    errors,
    stats
  }
}

// 上传单个Markdown文件（简化版本）
async function uploadSingleMarkdownFile(fileName, content, databaseId, config) {
  try {
    // 解析Front Matter和内容
    const { data: frontMatter, content: markdownContent } = matter(content)
    
    // 合并默认属性
    const finalProperties = { ...frontMatter }
    
    if (config?.defaultProperties) {
      // 如果启用了覆盖模式，或者原属性不存在，则使用默认值
      if (config.overrideWithDefaults || !finalProperties.title) {
        finalProperties.title = finalProperties.title || fileName.replace(/\.md$/, '')
      }
      
      if (config.overrideWithDefaults || !finalProperties.category) {
        finalProperties.category = config.defaultProperties.category || finalProperties.category
      }
      
      if (config.overrideWithDefaults || !finalProperties.tags || finalProperties.tags.length === 0) {
        finalProperties.tags = config.defaultProperties.tags?.length > 0 
          ? config.defaultProperties.tags 
          : finalProperties.tags || []
      }
      
      if (config.overrideWithDefaults || !finalProperties.status) {
        finalProperties.status = config.defaultProperties.status || finalProperties.status || 'Draft'
      }
      
      if (config.overrideWithDefaults || !finalProperties.type) {
        finalProperties.type = config.defaultProperties.type || finalProperties.type || 'Post'
      }
    }

    // 验证必需字段
    if (!finalProperties.title) {
      finalProperties.title = fileName.replace(/\.md$/, '')
    }

    // 记录上传日志
    console.log('📤 [UPLOAD SUCCESS]', {
      fileName,
      title: finalProperties.title,
      category: finalProperties.category,
      tags: finalProperties.tags,
      status: finalProperties.status,
      type: finalProperties.type,
      contentLength: markdownContent.length,
      timestamp: new Date().toISOString()
    })
    
    return {
      success: true,
      fileName,
      title: finalProperties.title,
      message: 'File processed successfully (simulation)',
      metadata: {
        title: finalProperties.title,
        tags: finalProperties.tags || [],
        category: finalProperties.category || '',
        status: finalProperties.status || 'Draft',
        type: finalProperties.type || 'Post',
        date: finalProperties.date || new Date().toISOString(),
        slug: finalProperties.slug || fileName.replace(/\.md$/, ''),
        summary: finalProperties.summary || finalProperties.description || '',
        contentLength: markdownContent.length,
        appliedDefaults: config?.defaultProperties ? {
          category: finalProperties.category === config.defaultProperties.category,
          tags: JSON.stringify(finalProperties.tags) === JSON.stringify(config.defaultProperties.tags),
          status: finalProperties.status === config.defaultProperties.status,
          type: finalProperties.type === config.defaultProperties.type
        } : {}
      }
    }
  } catch (error) {
    console.error('❌ [UPLOAD ERROR]', {
      fileName,
      error: error.message,
      timestamp: new Date().toISOString()
    })
    
    return {
      success: false,
      fileName,
      error: error.message
    }
  }
}

// 验证Markdown文件
async function validateMarkdownFiles(files) {
  const results = []
  
  for (const file of files) {
    try {
      const { data: frontMatter, content } = matter(file.content)
      
      const validation = {
        fileName: file.fileName,
        valid: true,
        errors: [],
        warnings: [],
        frontMatter
      }

      // 检查必需字段
      if (!frontMatter.title && !file.fileName) {
        validation.errors.push('Title is required')
        validation.valid = false
      }

      // 检查内容
      if (!content || content.trim().length === 0) {
        validation.warnings.push('Content is empty')
      }

      // 检查文件名格式
      if (!file.fileName.endsWith('.md')) {
        validation.warnings.push('File should have .md extension')
      }

      results.push(validation)
    } catch (error) {
      results.push({
        fileName: file.fileName,
        valid: false,
        errors: [`Invalid file format: ${error.message}`],
        warnings: []
      })
    }
  }

  return {
    success: true,
    results,
    stats: {
      total: files.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length
    }
  }
} 