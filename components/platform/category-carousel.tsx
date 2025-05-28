"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { ProjectCard } from "@/components/platform/project-card"
import { Project } from "@/components/platform/project-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselApi
} from "@/components/ui/carousel"
import { usePlatformContext } from "@/providers/platform-provider"

// 定义项目分类类型
type ProjectCategory = 'AI' | 'SOFTWARE' | 'GAME' | 'EDUCATION' | 'RESOURCE' | 'LIFE' | 'OTHER'

// 分类中文映射
const CATEGORY_NAMES: Record<ProjectCategory, string> = {
  AI: '人工智能',
  SOFTWARE: '软件工具',
  GAME: '游戏娱乐',
  EDUCATION: '教育学习',
  RESOURCE: '资源分享',
  LIFE: '生活服务',
  OTHER: '其他',
}

export function CategoryCarousel() {
  // 使用共享的平台数据
  const { projectsByCategory, categories, isProjectsLoading, isCategoriesLoading } = usePlatformContext()

  // 筛选出有项目的分类
  const activeCategories = Object.keys(projectsByCategory).filter(
    (category) => projectsByCategory[category as ProjectCategory].length > 0
  ) as ProjectCategory[]

  if (isProjectsLoading || isCategoriesLoading) {
    return <CategorySkeleton />
  }

  if (activeCategories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-500 dark:text-slate-400">
          暂无活跃项目
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-12">
      {activeCategories.map((category) => (
        <CategorySection 
          key={category} 
          category={category} 
          projects={projectsByCategory[category] as unknown as Project[]} 
          count={categories.find(c => c.name === category)?.count || 0}
        />
      ))}
    </div>
  )
}

interface CategorySectionProps {
  category: ProjectCategory
  projects: Project[]
  count: number
}

function CategorySection({ category, projects, count }: CategorySectionProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  // 监听轮播状态
  useEffect(() => {
    if (!carouselApi) return

    const updateScrollState = () => {
      setCanScrollPrev(carouselApi.canScrollPrev())
      setCanScrollNext(carouselApi.canScrollNext())
    }

    carouselApi.on('select', updateScrollState)
    updateScrollState()

    return () => {
      carouselApi.off('select', updateScrollState)
    }
  }, [carouselApi])

  if (projects.length === 0) return null

  return (
    <section className="w-full max-w-full space-y-4">
      {/* 分类标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          {CATEGORY_NAMES[category]}
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
            ({count})
          </span>
        </h2>
        
        <div className="flex items-center gap-3">
          {/* 轮播控制按钮 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              onClick={() => carouselApi?.scrollPrev()}
              disabled={!canScrollPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">上一页</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              onClick={() => carouselApi?.scrollNext()}
              disabled={!canScrollNext}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">下一页</span>
            </Button>
          </div>
          
          {/* 查看全部链接 */}
          <Link 
            href={`/platform/category/${category}`}
            className="text-sm font-medium px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1"
          >
            查看全部 <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      
      {/* 项目轮播 */}
      <div className="w-full">
        <Carousel
          setApi={setCarouselApi}
          className="w-full"
          opts={{
            align: "start",
            slidesToScroll: 1,
            containScroll: "trimSnaps",
            skipSnaps: false,
          }}
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {projects.map((project) => (
              <CarouselItem 
                key={project.id} 
                className="pl-3 md:pl-4 basis-[280px] sm:basis-[300px] md:basis-[320px] lg:basis-[280px] xl:basis-[300px] 2xl:basis-[320px] min-w-0 max-w-full"
              >
                <div className="h-full w-full max-w-full">
                  <ProjectCard project={project} variant="compact" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  )
}

function CategorySkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          {/* 标题骨架 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          
          {/* 项目卡片骨架 */}
          <div className="w-full overflow-hidden">
            <div className="flex gap-3 md:gap-4 -ml-3 md:-ml-4 pl-3 md:pl-4">
              {Array(4).fill(0).map((_, j) => (
                <div key={j} className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[280px] xl:w-[300px] 2xl:w-[320px]">
                  <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
                    {/* 头部 */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                    
                    {/* 标签 */}
                    <div className="flex gap-1">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    
                    {/* 进度条 */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                    
                    {/* 底部 */}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 