import { useState, useEffect, useRef } from 'react'

/**
 * 批量上传管理器组件
 * 参考 elog 的设计思路，提供批量上传、验证和预览功能
 */
export default function BatchUploadManager({ className = '' }) {
  const [files, setFiles] = useState([])
  const [databases, setDatabases] = useState([])
  const [selectedDatabase, setSelectedDatabase] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationResults, setValidationResults] = useState(null)
  const [uploadConfig, setUploadConfig] = useState({
    overwriteExisting: false,
    skipInvalid: true,
    customPropertyMapping: {},
    defaultProperties: {
      category: '',
      tags: [],
      status: 'Draft',
      type: 'Post'
    },
    overrideWithDefaults: false
  })
  const fileInputRef = useRef(null)

  // 获取用户的数据库列表
  useEffect(() => {
    fetchDatabases()
  }, [])

  const fetchDatabases = async () => {
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-databases' })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDatabases(data.databases)
        }
      }
    } catch (error) {
      console.error('Error fetching databases:', error)
    }
  }

  // 处理文件选择
  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files)
    processFiles(selectedFiles)
  }

  // 处理拖拽上传
  const handleDrop = (event) => {
    event.preventDefault()
    const droppedFiles = Array.from(event.dataTransfer.files)
    processFiles(droppedFiles)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  // 处理文件
  const processFiles = async (selectedFiles) => {
    const markdownFiles = selectedFiles.filter(file => 
      file.name.endsWith('.md') || file.name.endsWith('.markdown')
    )

    if (markdownFiles.length === 0) {
      alert('请选择 Markdown 文件 (.md 或 .markdown)')
      return
    }

    const fileContents = await Promise.all(
      markdownFiles.map(async (file) => {
        const content = await readFileContent(file)
        return {
          fileName: file.name,
          content,
          size: file.size,
          lastModified: file.lastModified
        }
      })
    )

    setFiles(fileContents)
    
    // 自动验证文件
    validateFiles(fileContents)
  }

  // 读取文件内容
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file, 'UTF-8')
    })
  }

  // 验证文件
  const validateFiles = async (filesToValidate = files) => {
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate-files',
          files: filesToValidate
        })
      })

      if (response.ok) {
        const results = await response.json()
        setValidationResults(results)
      }
    } catch (error) {
      console.error('Validation error:', error)
    }
  }

  // 批量上传
  const handleBatchUpload = async () => {
    if (files.length === 0) {
      alert('请先选择要上传的文件')
      return
    }

    if (!selectedDatabase) {
      alert('请选择目标数据库')
      return
    }

    if (validationResults && validationResults.invalidFiles > 0 && !uploadConfig.skipInvalid) {
      alert('存在无效文件，请先修复或启用"跳过无效文件"选项')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const validFiles = uploadConfig.skipInvalid 
        ? files.filter((_, index) => validationResults?.results?.[index]?.valid !== false)
        : files

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload-batch',
          files: validFiles,
          databaseId: selectedDatabase,
          uploadConfig
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          alert(`上传完成！成功上传 ${result.uploaded} 个文件，失败 ${result.failed} 个文件。`)
          
          // 显示结果详情
          if (result.errors.length > 0) {
            console.log('上传失败的文件:', result.errors)
          }
          
          // 清空文件列表
          setFiles([])
          setValidationResults(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        } else {
          alert('上传失败：' + result.error)
        }
      } else {
        alert('上传请求失败')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('上传过程中发生错误：' + error.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // 移除文件
  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    
    if (newFiles.length === 0) {
      setValidationResults(null)
    } else {
      validateFiles(newFiles)
    }
  }

  // 预览文件内容
  const previewFile = (file) => {
    const newWindow = window.open()
    newWindow.document.write(`
      <html>
        <head>
          <title>${file.fileName} - 预览</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
            h1, h2, h3 { color: #333; }
          </style>
        </head>
        <body>
          <h1>${file.fileName}</h1>
          <pre>${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `)
    newWindow.document.close()
  }

  return (
    <div className={`batch-upload-manager ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          批量上传管理器
        </h2>

        {/* 数据库选择 */}
        <div className="database-selection mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">选择目标数据库</h3>
          
          <div className="flex items-center space-x-4">
            <select 
              value={selectedDatabase}
              onChange={(e) => setSelectedDatabase(e.target.value)}
              className="flex-1 p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            >
              <option value="">请选择数据库</option>
              {databases.map(db => (
                <option key={db.id} value={db.id}>{db.title}</option>
              ))}
            </select>
            
            <button 
              onClick={fetchDatabases}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              刷新
            </button>
          </div>

          {selectedDatabase && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              已选择: {databases.find(db => db.id === selectedDatabase)?.title}
            </div>
          )}
        </div>

        {/* 上传配置 */}
        <div className="upload-config mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">上传配置</h3>
          
          <div className="space-y-4">
            {/* 基本配置 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="overwriteExisting"
                  checked={uploadConfig.overwriteExisting}
                  onChange={(e) => setUploadConfig(prev => ({ ...prev, overwriteExisting: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="overwriteExisting" className="text-sm text-gray-700 dark:text-gray-300">
                  覆盖已存在的页面
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="skipInvalid"
                  checked={uploadConfig.skipInvalid}
                  onChange={(e) => setUploadConfig(prev => ({ ...prev, skipInvalid: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="skipInvalid" className="text-sm text-gray-700 dark:text-gray-300">
                  跳过无效文件
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="overrideWithDefaults"
                  checked={uploadConfig.overrideWithDefaults}
                  onChange={(e) => setUploadConfig(prev => ({ ...prev, overrideWithDefaults: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="overrideWithDefaults" className="text-sm text-gray-700 dark:text-gray-300">
                  使用默认属性覆盖文件属性
                </label>
              </div>
            </div>

            {/* 默认属性设置 */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200">默认属性设置</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 默认分类 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    默认分类
                  </label>
                  <input 
                    type="text"
                    value={uploadConfig.defaultProperties.category}
                    onChange={(e) => setUploadConfig(prev => ({ 
                      ...prev, 
                      defaultProperties: { ...prev.defaultProperties, category: e.target.value }
                    }))}
                    className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    placeholder="例如: 技术博客"
                  />
                </div>

                {/* 默认状态 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    默认状态
                  </label>
                  <select 
                    value={uploadConfig.defaultProperties.status}
                    onChange={(e) => setUploadConfig(prev => ({ 
                      ...prev, 
                      defaultProperties: { ...prev.defaultProperties, status: e.target.value }
                    }))}
                    className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  >
                    <option value="Draft">草稿</option>
                    <option value="Published">已发布</option>
                    <option value="Private">私有</option>
                    <option value="Archived">归档</option>
                  </select>
                </div>

                {/* 默认类型 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    默认类型
                  </label>
                  <select 
                    value={uploadConfig.defaultProperties.type}
                    onChange={(e) => setUploadConfig(prev => ({ 
                      ...prev, 
                      defaultProperties: { ...prev.defaultProperties, type: e.target.value }
                    }))}
                    className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  >
                    <option value="Post">文章</option>
                    <option value="Page">页面</option>
                    <option value="Note">笔记</option>
                    <option value="Draft">草稿</option>
                  </select>
                </div>

                {/* 默认标签 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    默认标签
                  </label>
                  <input 
                    type="text"
                    value={uploadConfig.defaultProperties.tags.join(', ')}
                    onChange={(e) => setUploadConfig(prev => ({ 
                      ...prev, 
                      defaultProperties: { 
                        ...prev.defaultProperties, 
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }
                    }))}
                    className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    placeholder="例如: 技术, React, JavaScript"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    用逗号分隔多个标签
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 文件上传区域 */}
        <div 
          className="file-upload-area mb-6 p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center hover:border-blue-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="space-y-4">
            <div className="text-4xl text-gray-400">📁</div>
            <div>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                拖拽 Markdown 文件到这里，或者
              </p>
              <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                accept=".md,.markdown"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
              >
                选择文件
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              支持 .md 和 .markdown 格式
            </p>
          </div>
        </div>

        {/* 验证结果摘要 */}
        {validationResults && (
          <div className="validation-summary mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">验证结果</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded">
                <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {validationResults.validFiles}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">有效文件</div>
              </div>
              
              <div className="bg-red-100 dark:bg-red-900 p-3 rounded">
                <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                  {validationResults.invalidFiles}
                </div>
                <div className="text-sm text-red-600 dark:text-red-300">无效文件</div>
              </div>
              
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded">
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {validationResults.totalFiles}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">总文件数</div>
              </div>
            </div>
          </div>
        )}

        {/* 操作栏 */}
        <div className="actions mb-6 flex flex-wrap gap-4 items-center">
          <button 
            onClick={handleBatchUpload}
            disabled={files.length === 0 || !selectedDatabase || uploading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? '上传中...' : `批量上传 (${files.length})`}
          </button>

          <button 
            onClick={() => validateFiles()}
            disabled={files.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            重新验证
          </button>

          <button 
            onClick={() => {
              setFiles([])
              setValidationResults(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            disabled={files.length === 0}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 transition-colors"
          >
            清空列表
          </button>
        </div>

        {/* 上传进度 */}
        {uploading && (
          <div className="progress mb-6">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              上传进度: {uploadProgress}%
            </div>
          </div>
        )}

        {/* 文件列表 */}
        <div className="files-list">
          {files.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-600 dark:text-gray-400">暂无文件</div>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file, index) => {
                const validation = validationResults?.results?.[index]
                
                return (
                  <div 
                    key={`${file.fileName}-${index}`}
                    className={`file-item p-4 border rounded-lg ${
                      validation?.valid === false 
                        ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20' 
                        : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800'
                    } hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {file.fileName}
                          </h4>
                          
                          {validation && (
                            <span className={`px-2 py-1 text-xs rounded ${
                              validation.valid 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {validation.valid ? '有效' : '无效'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span>大小: {(file.size / 1024).toFixed(1)} KB</span>
                          <span>内容长度: {file.content.length} 字符</span>
                          {validation?.frontMatter?.title && (
                            <span>标题: {validation.frontMatter.title}</span>
                          )}
                        </div>

                        {validation && validation.issues?.length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">问题:</div>
                            <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                              {validation.issues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button 
                          onClick={() => previewFile(file)}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          预览
                        </button>
                        
                        <button 
                          onClick={() => removeFile(index)}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          移除
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 