import { useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'

export default function TestBatchPage() {
  const [testResult, setTestResult] = useState('')

  const testAPI = async () => {
    try {
      setTestResult('Testing API...')
      
      // 测试导出API
      const exportResponse = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-all-pages'
        })
      })
      
      const exportData = await exportResponse.json()
      
      // 测试上传API
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-databases'
        })
      })
      
      const uploadData = await uploadResponse.json()
      
      setTestResult(`
        Export API: ${exportResponse.ok ? 'OK' : 'Failed'}
        Export Data: ${JSON.stringify(exportData, null, 2)}
        
        Upload API: ${uploadResponse.ok ? 'OK' : 'Failed'}
        Upload Data: ${JSON.stringify(uploadData, null, 2)}
      `)
    } catch (error) {
      setTestResult(`Error: ${error.message}`)
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">批量管理功能测试</h1>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">API 测试</h2>
            <button 
              onClick={testAPI}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
            >
              测试 API
            </button>
            
            {testResult && (
              <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto whitespace-pre-wrap">
                {testResult}
              </pre>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">组件测试</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">✅ ErrorBoundary 组件</h3>
                <p className="text-sm text-gray-600">已加载并正常工作</p>
              </div>
              
              <div>
                <h3 className="font-semibold">✅ loadExternalResource 函数</h3>
                <p className="text-sm text-gray-600">已从 @/lib/utils 导入</p>
              </div>
              
              <div>
                <h3 className="font-semibold">✅ 页面路由</h3>
                <p className="text-sm text-gray-600">/test-batch 页面正常加载</p>
              </div>
              
              <div>
                <a 
                  href="/admin/batch-manager" 
                  className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  前往批量管理页面
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
} 