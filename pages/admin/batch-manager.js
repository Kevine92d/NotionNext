import { useState } from 'react'
import { useRouter } from 'next/router'
import BatchExportManager from '../../components/BatchExportManager'
import BatchUploadManager from '../../components/BatchUploadManager'
import ErrorBoundary from '../../components/ErrorBoundary'
import { siteConfig } from '@/lib/config'

/**
 * 批量管理页面
 * 参考 elog 的设计理念，提供统一的文档管理界面
 */
export default function BatchManagerPage() {
  const [activeTab, setActiveTab] = useState('export')
  const router = useRouter()

  // 检查管理员权限（这里是简单示例，实际项目中应该有完整的权限验证）
  const isAdmin = true // 实际中应该从认证状态中获取

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">访问被拒绝</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            您没有权限访问此页面
          </p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* 导航栏 */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => router.push('/')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← 返回博客
                </button>
                
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {siteConfig('TITLE')} - 文档管理中心
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  管理员模式
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 页面标题和描述 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              批量文档管理
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
              强大的文档批量处理工具，支持 Markdown 文档的批量导出和上传。
              参考 elog 项目的设计理念，为您提供高效的文档管理体验。
            </p>
          </div>

          {/* 功能特性卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-2xl mb-4">📤</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                批量导出
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                从 Notion 批量导出文档为 Markdown 格式，支持筛选、预览和打包下载
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-2xl mb-4">📥</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                批量上传
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                将本地 Markdown 文件批量上传到 Notion，自动解析 Front Matter 和内容
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-2xl mb-4">🔄</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                同步管理
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                高效的双向同步，让您在不同平台间无缝迁移和备份内容
              </p>
            </div>
          </div>

          {/* 标签页切换 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('export')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'export'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>📤</span>
                    <span>批量导出</span>
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'upload'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>📥</span>
                    <span>批量上传</span>
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'settings'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>⚙️</span>
                    <span>设置</span>
                  </span>
                </button>
              </nav>
            </div>

            {/* 标签页内容 */}
            <div className="p-6">
              {activeTab === 'export' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      批量导出 Markdown 文档
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      从 Notion 数据库中批量导出文档，支持筛选条件和自定义格式化选项。
                    </p>
                  </div>
                  <BatchExportManager />
                </div>
              )}

              {activeTab === 'upload' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      批量上传 Markdown 文档
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      将本地 Markdown 文件批量上传到指定的 Notion 数据库，自动解析 Front Matter。
                    </p>
                  </div>
                  <BatchUploadManager />
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      系统设置
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      配置批量处理的默认选项和系统参数。
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Notion 配置 */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Notion 配置
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            默认数据库 ID
                          </label>
                          <input 
                            type="text" 
                            className="w-full p-3 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                            placeholder="输入默认的 Notion 数据库 ID"
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            设置默认的上传目标数据库
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            API 请求限制
                          </label>
                          <select className="w-full p-3 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                            <option value="3">每秒 3 次请求</option>
                            <option value="5">每秒 5 次请求</option>
                            <option value="10">每秒 10 次请求</option>
                          </select>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            控制对 Notion API 的请求频率
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 导出设置 */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        导出设置
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" id="includeImages" className="rounded" />
                          <label htmlFor="includeImages" className="text-sm text-gray-700 dark:text-gray-300">
                            默认包含图片资源
                          </label>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input type="checkbox" id="useSlugAsFilename" className="rounded" />
                          <label htmlFor="useSlugAsFilename" className="text-sm text-gray-700 dark:text-gray-300">
                            使用 slug 作为文件名
                          </label>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input type="checkbox" id="compressImages" className="rounded" />
                          <label htmlFor="compressImages" className="text-sm text-gray-700 dark:text-gray-300">
                            压缩图片文件
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 上传设置 */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        上传设置
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" id="autoValidate" className="rounded" defaultChecked />
                          <label htmlFor="autoValidate" className="text-sm text-gray-700 dark:text-gray-300">
                            自动验证文件格式
                          </label>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input type="checkbox" id="skipDuplicates" className="rounded" defaultChecked />
                          <label htmlFor="skipDuplicates" className="text-sm text-gray-700 dark:text-gray-300">
                            跳过重复文件
                          </label>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input type="checkbox" id="preserveFrontMatter" className="rounded" defaultChecked />
                          <label htmlFor="preserveFrontMatter" className="text-sm text-gray-700 dark:text-gray-300">
                            保留 Front Matter 属性
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 保存按钮 */}
                    <div className="flex justify-end">
                      <button className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                        保存设置
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 使用说明 */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
              💡 使用说明
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800 dark:text-blue-200">
              <div>
                <h4 className="font-medium mb-2">批量导出功能</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>支持按状态、类型、标签等条件筛选</li>
                  <li>可以预览单个文档内容</li>
                  <li>支持单个导出或批量打包下载</li>
                  <li>自动生成符合标准的 Front Matter</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">批量上传功能</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>支持拖拽上传和文件选择</li>
                  <li>自动验证文件格式和内容</li>
                  <li>解析 Front Matter 并映射到 Notion 属性</li>
                  <li>提供详细的上传结果反馈</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 相关链接 */}
          <div className="mt-8 text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              参考项目：
              <a 
                href="https://github.com/LetTTGACO/elog" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 ml-2"
              >
                elog - 开放式跨平台博客解决方案
              </a>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
} 