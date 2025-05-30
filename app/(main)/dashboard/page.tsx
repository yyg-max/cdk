import { DashboardOverview } from "@/components/dashboard/dashboard-overview"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-none sm:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
        {/* 页面标题 */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 break-words">
            实时数据
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 break-words">
            平台资源实时数据公开面板
          </p>
        </div>

        {/* 仪表板内容 */}
        <div className="w-full overflow-hidden">
          <DashboardOverview />
        </div>
      </div>
    </div>
  )
}