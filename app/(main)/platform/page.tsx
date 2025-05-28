import { WelcomeBanner } from "@/components/platform/welcome-banner"
import { CategoryCarousel } from "@/components/platform/category-carousel"
import { SearchFilterBar } from "@/components/platform/search-bar"
import { PlatformProvider } from "@/providers/platform-provider"

export default function PlatformPage() {
  return (
    <PlatformProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* 欢迎横幅 */}
          <WelcomeBanner />
          
          {/* 搜索和筛选栏 */}
          <SearchFilterBar />
          
          {/* 按分类展示项目 */}
          <div className="max-w-full overflow-hidden">
            <CategoryCarousel />
          </div>
        </div>
      </div>
    </PlatformProvider>
  )
}
