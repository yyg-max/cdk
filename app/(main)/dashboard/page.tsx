import { DashboardOverview } from "@/components/dashboard/dashboard-overview"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            实时数据
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            平台资源实时数据公开面板
          </p>
        </div>

        {/* 仪表板内容 */}
        <DashboardOverview />
      </div>
    </div>
  )
}