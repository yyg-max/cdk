import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DistributionMode, ProjectCategory } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "用户未登录" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 查询用户的单码领取记录
    const singleClaims = await prisma.singleCodeClaim.findMany({
      where: {
        claimerId: userId,
        isClaimed: true
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            usageUrl: true,
            distributionMode: true,
            tutorial: true
          }
        }
      },
      orderBy: {
        claimedAt: 'desc'
      }
    })

    // 查询用户的多码领取记录
    const multiClaims = await prisma.multiCodeClaim.findMany({
      where: {
        claimerId: userId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            usageUrl: true,
            distributionMode: true,
            tutorial: true
          }
        }
      },
      orderBy: {
        claimedAt: 'desc'
      }
    })

    // 查询用户的手动申请记录（已通过的）
    const manualClaims = await prisma.manualApplication.findMany({
      where: {
        applicantId: userId,
        status: 'APPROVED'
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            usageUrl: true,
            distributionMode: true,
            tutorial: true
          }
        }
      },
      orderBy: {
        processedAt: 'desc'
      }
    })

    // 整合所有记录，格式化数据
    const formattedSingleClaims = singleClaims.map(claim => ({
      id: claim.id,
      projectId: claim.projectId,
      projectName: claim.project.name,
      projectDescription: claim.project.description,
      category: claim.project.category,
      distributionMode: DistributionMode.SINGLE,
      content: claim.content,
      claimedAt: claim.claimedAt,
      usageUrl: claim.project.usageUrl,
      tutorial: claim.project.tutorial
    }))

    const formattedMultiClaims = multiClaims.map(claim => ({
      id: claim.id,
      projectId: claim.projectId,
      projectName: claim.project.name,
      projectDescription: claim.project.description,
      category: claim.project.category,
      distributionMode: DistributionMode.MULTI,
      // 多码领取记录不直接包含内容，需要单独查询
      content: null,
      claimedAt: claim.claimedAt,
      usageUrl: claim.project.usageUrl,
      tutorial: claim.project.tutorial
    }))

    const formattedManualClaims = manualClaims.map(claim => ({
      id: claim.id,
      projectId: claim.projectId,
      projectName: claim.project.name,
      projectDescription: claim.project.description,
      category: claim.project.category,
      distributionMode: DistributionMode.MANUAL,
      content: null, // 手动申请不包含具体邀请码
      claimedAt: claim.processedAt,
      usageUrl: claim.project.usageUrl,
      tutorial: claim.project.tutorial
    }))

    // 合并所有记录
    const allClaims = [
      ...formattedSingleClaims,
      ...formattedMultiClaims,
      ...formattedManualClaims
    ]

    // 按领取时间排序
    const sortedClaims = allClaims.sort((a, b) => {
      const dateA = a.claimedAt ? new Date(a.claimedAt).getTime() : 0
      const dateB = b.claimedAt ? new Date(b.claimedAt).getTime() : 0
      return dateB - dateA // 降序排序
    })

    // 获取统计需要的日期范围
    const currentDate = new Date()
    // 设置为当天的开始时间
    currentDate.setHours(0, 0, 0, 0)
    
    const ninetyDaysAgo = new Date(currentDate)
    ninetyDaysAgo.setDate(currentDate.getDate() - 90)

    // 创建一个数组，包含最近90天的每一天
    const days: Date[] = []
    for (let i = 0; i < 90; i++) {
      const day = new Date(ninetyDaysAgo)
      day.setDate(ninetyDaysAgo.getDate() + i)
      days.push(day)
    }

    // 创建按天和分类的统计对象
    const dailyStatsMap = new Map<string, number>()
    const categoryDailyStatsMap = new Map<string, Map<string, number>>()

    // 初始化每天的数据
    days.forEach(day => {
      const dayKey = formatDate(day)
      dailyStatsMap.set(dayKey, 0)
      
      // 初始化每天的分类计数
      const categoryCounts = new Map<string, number>()
      Object.values(ProjectCategory).forEach(category => {
        categoryCounts.set(category, 0)
      })
      categoryDailyStatsMap.set(dayKey, categoryCounts)
    })

    // 计算按天统计和按分类统计
    allClaims.forEach(claim => {
      if (!claim.claimedAt) return
      
      const claimDate = new Date(claim.claimedAt)
      // 设置为该天的开始时间以便比较
      claimDate.setHours(0, 0, 0, 0)
      
      // 只处理最近90天内的记录
      if (claimDate < ninetyDaysAgo) return
      
      const dayKey = formatDate(claimDate)
      
      // 增加日计数
      if (dailyStatsMap.has(dayKey)) {
        dailyStatsMap.set(dayKey, (dailyStatsMap.get(dayKey) || 0) + 1)
        
        // 增加分类计数
        const categoryCounts = categoryDailyStatsMap.get(dayKey)
        if (categoryCounts && claim.category) {
          categoryCounts.set(
            claim.category, 
            (categoryCounts.get(claim.category) || 0) + 1
          )
        }
      }
    })

    // 转换为API响应格式 - 日统计
    const dailyStats = []
    // 按日期排序，从最早到最近
    const sortedDays = Array.from(dailyStatsMap.entries())
      .sort((a, b) => {
        // 按日期字符串排序 (YYYY-MM-DD)
        return a[0].localeCompare(b[0])
      })
    
    for (const [day, count] of sortedDays) {
      dailyStats.push({
        month: day, // 使用与前端一致的字段名
        count
      })
    }

    // 转换为API响应格式 - 按分类的日统计
    const categoryStats = []
    for (const [day, categoryCounts] of categoryDailyStatsMap.entries()) {
      const dayData: any = { month: day } // 使用与前端一致的字段名
      
      // 添加每个分类的计数
      for (const [category, count] of categoryCounts.entries()) {
        dayData[category] = count
      }
      
      categoryStats.push(dayData)
    }
    
    // 排序与日统计相同的顺序
    categoryStats.sort((a, b) => a.month.localeCompare(b.month))

    return NextResponse.json({
      claims: sortedClaims,
      statistics: {
        total: sortedClaims.length,
        monthlyStats: dailyStats,
        categoryStats
      }
    })

  } catch (error) {
    console.error("获取领取记录失败:", error)
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    )
  }
}

// 辅助函数：格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
} 