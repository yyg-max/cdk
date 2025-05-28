"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RollingText } from "@/components/animate-ui/text/rolling"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Calendar, Users, ChartPie } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { usePlatformContext } from "@/providers/platform-provider"

// 项目分类中文映射（按顺序）
const CATEGORY_NAMES: Record<string, string> = {
  AI: '人工智能',
  SOFTWARE: '软件工具',
  GAME: '游戏娱乐',
  EDUCATION: '教育学习',
  RESOURCE: '资源分享',
  LIFE: '生活服务',
  OTHER: '其他',
}

// 格式化日期时间，精确到秒
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function WelcomeBanner() {
  // 使用共享的平台数据
  const { stats, featuredProjects, isStatsLoading, isFeaturedLoading } = usePlatformContext()
  
  // API 引用
  const [api, setApi] = React.useState<any>(null)
  const [current, setCurrent] = React.useState(0)
  
  // 手动切换到下一个或前一个
  const handlePrev = useCallback(() => {
    if (!api) return;
    api.scrollPrev();
  }, [api]);

  const handleNext = useCallback(() => {
    if (!api) return;
    api.scrollNext();
  }, [api]);
  
  // 自动轮播
  useEffect(() => {
    if (!api || isFeaturedLoading) return;
    
    // 设置自动轮播间隔
    const intervalId = setInterval(() => {
      if (current === (featuredProjects.length + 1) - 1) {
        api.scrollTo(0);
      } else {
        api.scrollNext();
      }
    }, 10000);

    // 清理
    return () => clearInterval(intervalId);
  }, [api, current, featuredProjects.length, isFeaturedLoading]);

  // 监听当前滑块变化
  useEffect(() => {
    if (!api) return;
    
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };
    
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // 如果正在加载，显示骨架屏
  if (isStatsLoading || isFeaturedLoading) {
    return (
      <div className="w-full mb-8">
        <div className="w-full h-80 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="w-full mb-8 relative">
      <Carousel className="w-full" setApi={setApi} opts={{ loop: true }}>
        <CarouselContent>
          {/* 平台信息卡片 - Spotify风格 */}
          <CarouselItem key="stats">
            <div className="p-1">
              <div className="relative h-80 w-full overflow-hidden rounded-xl">
                {/* 背景渐变 - 保留原有颜色 */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-blue-800/90" />
                
                {/* 装饰元素 */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                
                {/* 内容区域 - Spotify风格布局 */}
                <div className="absolute inset-0 p-3 sm:p-5 md:p-8 flex flex-col">
                  {/* 顶部标题区 */}
                  <div className="flex flex-col mt-2 sm:mt-4">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                      <RollingText 
                        text="欢迎使用 FastShare" 
                        loop={false}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </h1>

                    <div className="flex items-center gap-2 mt-1 sm:mt-2">
                      <div className="text-sm sm:text-base text-white/80">安全分发快人一步，一键领取省时省力</div>
                    </div>
                  </div>
                  
                  {/* 中间内容区 - 统计数字 */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                      <div className="flex flex-col">
                        <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0 sm:mb-1">{stats?.totalProjects || 0}</span>
                        <span className="text-white/70 text-xs sm:text-sm">总项目数</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0 sm:mb-1">{stats?.activeProjects || 0}</span>
                        <span className="text-white/70 text-xs sm:text-sm">活跃项目</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0 sm:mb-1">{stats?.totalUsers || 0}</span>
                        <span className="text-white/70 text-xs sm:text-sm">总用户数</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0 sm:mb-1">{stats?.totalClaims || 0}</span>
                        <span className="text-white/70 text-xs sm:text-sm">总领取数</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 底部按钮区 */}
                  <div className="mt-auto">
                    <div className="flex gap-2 sm:gap-3">
                      <Button 
                        variant="default" 
                        size="sm"
                        className="bg-white hover:bg-white/90 text-blue-700 text-[10px] sm:text-sm sm:h-9 h-8"
                      >
                        开始探索
                      </Button>
                      
                      <Link href="/project" passHref>
                        <Button 
                          variant="default"
                          size="sm" 
                          className="text-white bg-none text-[10px] sm:text-sm sm:h-9 h-8"
                        >
                          创建项目
                          <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>

          {/* 特色项目卡片 - 优化移动端适配 */}
          {featuredProjects.map((project) => (
            <CarouselItem key={project.id}>
              <div className="p-1">
                <div className="relative h-80 w-full overflow-hidden rounded-xl">
                  {/* 背景渐变 - 保留原有颜色 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-violet-700/90" />
                  
                  {/* 装饰元素 */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                  
                  {/* 主要内容 - 调整布局适配移动端 */}
                  <div className="absolute inset-0 p-3 sm:p-5 md:p-6 flex flex-col">
                    {/* 顶部区域 - 标题和详情按钮 */}
                    <div className="flex items-start justify-between mb-1 sm:mb-2">
                      <div className="flex-1 mr-2">
                        {/* 分类标签 */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                          <Badge 
                            variant="outline" 
                            className="text-white border-white/30 bg-white/10 backdrop-blur-sm text-[10px] sm:text-xs"
                          >
                            {CATEGORY_NAMES[project.category] || project.category}
                          </Badge>
                          
                          {project.requireLinuxdo && (
                            <Badge className="bg-amber-500/60 text-white border-none text-[10px] sm:text-xs">
                              LinuxDo {project.minTrustLevel > 0 && `T${project.minTrustLevel}`}
                            </Badge>
                          )}
                          
                          <Badge className="bg-blue-500/60 text-white border-none text-[10px] sm:text-xs">
                            {project.distributionMode === 'SINGLE' ? '一码一用' : 
                              project.distributionMode === 'MULTI' ? '一码多用' : '手动邀请'}
                          </Badge>
                        </div>
                        
                        {/* 项目标题 */}
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight mt-2 sm:mt-4 line-clamp-1">
                          {project.name}
                        </h2>
                      </div>
                      
                      {/* 详情按钮 - 放置在右上角 */}
                      <Link href={`/platform/share/${project.id}`} passHref>
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-white hover:bg-white/90 text-blue-700 shrink-0 ml-1 sm:ml-3 text-[10px] sm:text-xs h-7 sm:h-8"
                        >
                          了解详情
                        </Button>
                      </Link>
                    </div>
                    
                    {/* 项目描述 - 响应式文本大小 */}
                    <p className="text-white/80 text-[10px] sm:text-xs md:text-sm line-clamp-2 sm:line-clamp-2 md:line-clamp-3 mt-1">
                      {project.description || '发布者未提供项目描述'}
                    </p>
                    
                    {/* 创建者信息 - 移动端优化 */}
                    <div className="flex items-center mt-3 sm:mt-6 md:mt-3">
                      <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-white/10 flex items-center justify-center mr-1 sm:mr-2">
                        {project.creator.image ? (
                          <img 
                            src={project.creator.image} 
                            alt={project.creator.nickname || project.creator.name} 
                            className="w-full h-full rounded-full object-cover" 
                          />
                        ) : (
                          <span className="text-white text-[8px] sm:text-xs">{project.creator.nickname?.[0] || project.creator.name?.[0] || '?'}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-xs font-medium text-white">{project.creator.nickname || project.creator.name}</div>
                        <div className="text-[8px] sm:text-[10px] text-white/60">创建于 {formatDateTime(project.createdAt)}</div>
                      </div>
                    </div>
                    
                    {/* 项目详情区块 - 适配移动端和平板 */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 bg-white/5 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      
                      {/* 开始时间 */}
                      <div className="rounded-md py-1 sm:py-2">
                        <div className="flex items-center">
                          <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/60 mr-1" />
                          <div className="text-[8px] sm:text-[10px] text-white/60">开始时间</div>
                        </div>
                        <div className="text-[8px] sm:text-[10px] font-medium text-white break-all mt-1 sm:mt-2 line-clamp-1">
                          {formatDateTime(project.startTime)}
                        </div>
                      </div>
                      
                      {/* 结束时间 */}
                      <div className="rounded-md py-1 sm:py-2">
                        <div className="flex items-center">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/60 mr-1" />
                          <div className="text-[8px] sm:text-[10px] text-white/60">结束时间</div>
                        </div>
                        <div className="text-[8px] sm:text-[10px] font-medium text-white break-all mt-1 sm:mt-2 line-clamp-1">
                          {project.endTime ? formatDateTime(project.endTime) : '永久有效'}
                        </div>
                      </div>
                      
                      {/* 项目信息（活跃状态+总名额） */}
                      <div className="rounded-md py-1 sm:py-2">
                        <div className="flex items-center">
                          <ChartPie className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/60 mr-1" />
                          <div className="text-[8px] sm:text-[10px] text-white/60">项目情况</div>
                        </div>
                        <div className="text-[8px] sm:text-[10px] font-medium text-white break-all mt-1 sm:mt-2">
                          <span className={`inline-block w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full mr-1 ${
                              project.status === 'ACTIVE' ? 'bg-green-500' : 
                              project.status === 'PAUSED' ? 'bg-amber-500' : 
                              'bg-red-500'
                            }`}></span>
                            {project.status === 'ACTIVE' ? '进行中' : 
                              project.status === 'PAUSED' ? '已暂停' : 
                              project.status === 'COMPLETED' ? '已完成' : '已过期'}
                        </div>
                      </div>

                      {/* 领取进度 - 数字在上，进度条在下 */}
                      <div className="rounded-md py-1 sm:py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/60 mr-1" />
                            <div className="text-[8px] sm:text-[10px] text-white/60">领取进度</div>
                          </div>
                          <div className="text-[8px] sm:text-[10px] font-medium text-white">
                            {project.claimedCount}/{project.totalQuota}
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-4">
                            <div className="h-1 sm:h-1.5 bg-white/20 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.round((project.claimedCount / project.totalQuota) * 100))}%` }}
                              ></div>
                            </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* 轮播控制器 - 适配移动端 */}
      <div className="absolute bottom-2 sm:bottom-3 left-0 right-0 flex items-center justify-center gap-1 sm:gap-2 z-10">
        {/* 左侧按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          className="h-5 w-5 sm:h-7 sm:w-7 rounded-full bg-black/20 text-white hover:bg-black/30 backdrop-blur-sm"
        >
          <ChevronLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </Button>

        {/* 轮播指示器 */}
        <div className="flex gap-1">
          {[0, ...Array(featuredProjects.length).keys()].map((_, index) => (
            <button
              key={index}
              className={`transition-all duration-200 ${
                index === current 
                  ? "w-5 sm:w-8 h-0.5 sm:h-1 bg-white rounded-full" 
                  : "w-1 sm:w-1.5 h-0.5 sm:h-1 bg-white/40 hover:bg-white/60 rounded-full"
              }`}
              onClick={() => api?.scrollTo(index)}
            />
          ))}
        </div>

        {/* 右侧按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="h-5 w-5 sm:h-7 sm:w-7 rounded-full bg-black/20 text-white hover:bg-black/30 backdrop-blur-sm"
        >
          <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </Button>
      </div>
    </div>
  )
} 