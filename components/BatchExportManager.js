import { useState, useEffect, useMemo } from 'react'
import { loadExternalResource } from '@/lib/utils'

/**
 * 批量导出管理器组件
 * 参考 elog 的设计思路，提供批量导出、过滤和下载功能
 */
export default function BatchExportManager({ className = '' }) {
  const [pages, setPages] = useState([])
  const [selectedPages, setSelectedPages] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [filterConfig, setFilterConfig] = useState({
    status: '',
    type: '',
    category: '',
    tags: [],
    dateRange: { start: '', end: '' },
    keyword: ''
  })
  const [exportConfig, setExportConfig] = useState({
    includeImages: true,
    processImages: false,
    customFields: {},
    frontMatterStyle: 'yaml'
  })

  // 获取所有页面
  const fetchAllPages = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get-all-pages'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch pages')
      }

      const data = await response.json()
      
      // 检查返回的数据结构
      if (Array.isArray(data)) {
        setPages(data)
      } else if (data.success && Array.isArray(data.pages)) {
        setPages(data.pages)
      } else if (data.success && Array.isArray(data)) {
        setPages(data)
      } else {
        console.warn('Unexpected data format:', data)
        setPages([])
      }
    } catch (error) {
      console.error('Error fetching pages:', error)
      alert('获取页面列表失败：' + error.message)
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  // 初始化页面数据
  useEffect(() => {
    fetchAllPages()
  }, [])

  // 过滤页面
  const filteredPages = useMemo(() => {
    if (!Array.isArray(pages)) {
      console.warn('Pages is not an array:', pages)
      return []
    }

    return pages.filter(page => {
      if (!page) return false

      // 状态过滤
      if (filterConfig.status && page.status !== filterConfig.status) {
        return false
      }

      // 类型过滤
      if (filterConfig.type && page.type !== filterConfig.type) {
        return false
      }

      // 分类过滤
      if (filterConfig.category && page.category !== filterConfig.category) {
        return false
      }

      // 标签过滤
      if (filterConfig.tags && filterConfig.tags.length > 0) {
        const pageTags = Array.isArray(page.tags) ? page.tags : []
        const hasTag = filterConfig.tags.some(tag => 
          pageTags.includes(tag)
        )
        if (!hasTag) return false
      }

      // 日期范围过滤
      if (filterConfig.dateRange?.start || filterConfig.dateRange?.end) {
        const pageDate = new Date(page.date)
        const startDate = filterConfig.dateRange?.start ? new Date(filterConfig.dateRange.start) : null
        const endDate = filterConfig.dateRange?.end ? new Date(filterConfig.dateRange.end) : null

        if (startDate && pageDate < startDate) return false
        if (endDate && pageDate > endDate) return false
      }

      // 关键词搜索
      if (filterConfig.keyword) {
        const keyword = filterConfig.keyword.toLowerCase()
        const title = (page.title || '').toLowerCase()
        const summary = (page.summary || '').toLowerCase()
        const category = (page.category || '').toLowerCase()
        
        if (!title.includes(keyword) && !summary.includes(keyword) && !category.includes(keyword)) {
          return false
        }
      }

      return true
    })
  }, [pages, filterConfig])

  // 选择/取消选择页面
  const togglePageSelection = (pageId) => {
    setSelectedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    )
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    setSelectedPages(selectedPages.length === filteredPages.length ? [] : filteredPages.map(p => p.id))
  }

  // 批量导出
  const handleBatchExport = async () => {
    if (selectedPages.length === 0) {
      alert('请至少选择一个页面进行导出')
      return
    }

    setExporting(true)
    setExportProgress(0)

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export-batch',
          pageIds: selectedPages,
          exportConfig,
          filterConfig
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          // 创建ZIP文件并下载
          await downloadAsZip(result.results)
          alert(`导出完成！成功导出 ${result.exported} 个文件，失败 ${result.failed} 个文件。`)
        } else {
          alert('导出失败：' + result.error)
        }
      } else {
        alert('导出请求失败')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('导出过程中发生错误：' + error.message)
    } finally {
      setExporting(false)
      setExportProgress(0)
    }
  }

  // 下载单个文件
  const downloadSingleFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.md') ? filename : `${filename}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 下载为ZIP文件
  const downloadAsZip = async (results) => {
    try {
      // 动态加载JSZip库
      if (typeof window !== 'undefined' && !window.JSZip) {
        await loadExternalResource('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', 'js')
      }
      
      if (!window.JSZip) {
        throw new Error('Failed to load JSZip library')
      }
      
      const zip = new window.JSZip()
      
      results.forEach(result => {
        if (result.success && result.markdown) {
          const filename = `${result.slug || result.title || result.pageId}.md`
          zip.file(filename, result.markdown)
        }
      })

      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `notion-export-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error creating ZIP file:', error)
      alert('创建ZIP文件失败：' + error.message)
    }
  }

  // 导出单个页面
  const exportSinglePage = async (pageId) => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export-single',
          pageId,
          exportConfig
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          downloadSingleFile(result.markdown, result.title)
        } else {
          alert('导出失败：' + result.error)
        }
      }
    } catch (error) {
      console.error('Single export error:', error)
      alert('导出失败：' + error.message)
    }
  }

  // 获取所有可用的标签和分类
  const allTags = [...new Set(pages.flatMap(page => page.tags || []))]
  const allCategories = [...new Set(pages.map(page => page.category).filter(Boolean))]
  const allStatuses = [...new Set(pages.map(page => page.status).filter(Boolean))]
  const allTypes = [...new Set(pages.map(page => page.type).filter(Boolean))]

  return (
    <div className={`batch-export-manager ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          批量导出管理器
        </h2>

        {/* 过滤器 */}
        <div className="filter-section mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">过滤条件</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 状态过滤 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">状态</label>
              <select 
                value={filterConfig.status}
                onChange={(e) => setFilterConfig(prev => ({ ...prev, status: e.target.value }))}
                className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              >
                <option value="">全部状态</option>
                {allStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* 类型过滤 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">类型</label>
              <select 
                value={filterConfig.type}
                onChange={(e) => setFilterConfig(prev => ({ ...prev, type: e.target.value }))}
                className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              >
                <option value="">全部类型</option>
                {allTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* 分类过滤 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">分类</label>
              <select 
                value={filterConfig.category}
                onChange={(e) => setFilterConfig(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              >
                <option value="">全部分类</option>
                {allCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* 日期范围 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">日期范围</label>
              <div className="flex space-x-2">
                <input 
                  type="date"
                  value={filterConfig.dateRange.start}
                  onChange={(e) => setFilterConfig(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="flex-1 p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
                <input 
                  type="date"
                  value={filterConfig.dateRange.end}
                  onChange={(e) => setFilterConfig(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="flex-1 p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
            </div>

            {/* 关键词搜索 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">关键词</label>
              <input 
                type="text"
                value={filterConfig.keyword}
                onChange={(e) => setFilterConfig(prev => ({ ...prev, keyword: e.target.value }))}
                className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 导出配置 */}
        <div className="export-config mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">导出配置</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="includeImages"
                checked={exportConfig.includeImages}
                onChange={(e) => setExportConfig(prev => ({ ...prev, includeImages: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="includeImages" className="text-sm text-gray-700 dark:text-gray-300">
                包含图片
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="processImages"
                checked={exportConfig.processImages}
                onChange={(e) => setExportConfig(prev => ({ ...prev, processImages: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="processImages" className="text-sm text-gray-700 dark:text-gray-300">
                处理图片链接
              </label>
            </div>
          </div>
        </div>

        {/* 操作栏 */}
        <div className="actions mb-6 flex flex-wrap gap-4 items-center">
          <button 
            onClick={toggleSelectAll}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {selectedPages.length === filteredPages.length ? '取消全选' : '全选'}
          </button>

          <button 
            onClick={handleBatchExport}
            disabled={selectedPages.length === 0 || exporting}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? '导出中...' : `批量导出 (${selectedPages.length})`}
          </button>

          <button 
            onClick={fetchAllPages}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-400 transition-colors"
          >
            {loading ? '刷新中...' : '刷新列表'}
          </button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            显示 {filteredPages.length} / {pages.length} 个页面
          </div>
        </div>

        {/* 导出进度 */}
        {exporting && (
          <div className="progress mb-6">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              导出进度: {exportProgress}%
            </div>
          </div>
        )}

        {/* 页面列表 */}
        <div className="pages-list">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-600 dark:text-gray-400">加载中...</div>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-600 dark:text-gray-400">没有找到符合条件的页面</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPages.map(page => (
                <div 
                  key={page.id}
                  className="page-item p-4 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <input 
                        type="checkbox"
                        checked={selectedPages.includes(page.id)}
                        onChange={() => togglePageSelection(page.id)}
                        className="mt-1 rounded"
                      />
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {page.title || 'Untitled'}
                        </h4>
                        
                        <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                            {page.type || 'Page'}
                          </span>
                          
                          {page.status && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded">
                              {page.status}
                            </span>
                          )}
                          
                          {page.category && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 rounded">
                              {page.category}
                            </span>
                          )}
                          
                          {page.date && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                              {new Date(page.date.start_date || page.date).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {page.tags && page.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {page.tags.map(tag => (
                              <span 
                                key={tag}
                                className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {page.summary && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {page.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => exportSinglePage(page.id)}
                      className="ml-4 px-3 py-1 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                    >
                      单独导出
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 