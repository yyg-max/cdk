import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数中的时间范围
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 按批次查询数据，避免同时打开过多连接
    
    // 批次1：基础计数统计
    const [
      // 用户统计
      totalUsers,
      newUsers,
      linuxdoUsers,
      bannedUsers,
      
      // 项目统计
      totalProjects,
      activeProjects,
      
      // 领取统计
      totalSingleClaims,
      totalMultiClaims,
    ] = await Promise.all([
      // 用户统计
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.user.count({
        where: { source: "linuxdo" }
      }),
      prisma.user.count({
        where: { banned: true }
      }),
      
      // 项目统计
      prisma.shareProject.count(),
      prisma.shareProject.count({
        where: { status: "ACTIVE" }
      }),
      
      // 领取统计
      prisma.singleCodeClaim.count({
        where: { isClaimed: true }
      }),
      prisma.multiCodeClaim.count(),
    ]);

    // 批次2：更多计数统计
    const [
      // 项目相关
      newProjects,
      recentSingleClaims,
      recentMultiClaims,
      
      // 申请统计
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
    ] = await Promise.all([
      prisma.shareProject.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.singleCodeClaim.count({
        where: { 
          isClaimed: true,
          claimedAt: { gte: startDate }
        }
      }),
      prisma.multiCodeClaim.count({
        where: { claimedAt: { gte: startDate } }
      }),
      
      // 申请统计
      prisma.manualApplication.count(),
      prisma.manualApplication.count({
        where: { status: "PENDING" }
      }),
      prisma.manualApplication.count({
        where: { status: "APPROVED" }
      }),
      prisma.manualApplication.count({
        where: { status: "REJECTED" }
      }),
    ]);

    // 批次3：分组查询
    const [
      projectsByCategory,
      projectsByMode,
      projectsByStatus,
    ] = await Promise.all([
      prisma.shareProject.groupBy({
        by: ['category'],
        _count: { id: true }
      }),
      prisma.shareProject.groupBy({
        by: ['distributionMode'],
        _count: { id: true }
      }),
      prisma.shareProject.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
    ]);

    // 批次4：趋势数据
    const [
      userTrend,
      projectTrend,
      claimTrend,
    ] = await Promise.all([
      prisma.$queryRaw<Array<{date: string, count: bigint}>>`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM user 
        WHERE createdAt >= ${startDate}
        GROUP BY DATE(createdAt)
        ORDER BY date
      `,
      prisma.$queryRaw<Array<{date: string, count: bigint}>>`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM share_project 
        WHERE createdAt >= ${startDate}
        GROUP BY DATE(createdAt)
        ORDER BY date
      `,
      prisma.$queryRaw<Array<{date: string, count: bigint}>>`
        SELECT DATE(claimedAt) as date, COUNT(*) as count
        FROM (
          SELECT claimedAt FROM single_code_claim WHERE isClaimed = true AND claimedAt >= ${startDate}
          UNION ALL
          SELECT claimedAt FROM multi_code_claim WHERE claimedAt >= ${startDate}
        ) as all_claims
        GROUP BY DATE(claimedAt)
        ORDER BY date
      `,
    ]);

    // 批次5：热门数据
    const [
      popularProjects,
      activeCreators,
      activeClaimers,
      popularTags
    ] = await Promise.all([
      // 热门项目
      prisma.$queryRaw<Array<{
        id: string, 
        name: string, 
        category: string,
        distributionMode: string,
        claimedCount: number
      }>>`
        SELECT p.id, p.name, p.category, p.distributionMode, p.claimedCount
        FROM share_project p
        WHERE p.status = 'ACTIVE' AND p.isPublic = true
        ORDER BY p.claimedCount DESC
        LIMIT 5
      `,
      
      // 活跃创建者
      prisma.$queryRaw<Array<{
        creatorId: string,
        creatorName: string, 
        projectCount: bigint,
        totalClaims: bigint
      }>>`
        SELECT 
          u.id as creatorId,
          u.name as creatorName,
          COUNT(p.id) as projectCount,
          SUM(p.claimedCount) as totalClaims
        FROM user u
        JOIN share_project p ON u.id = p.creatorId
        WHERE p.status = 'ACTIVE'
        GROUP BY u.id, u.name
        ORDER BY totalClaims DESC
        LIMIT 5
      `,
      
      // 活跃领取者
      prisma.$queryRaw<Array<{
        userId: string,
        userName: string,
        claimedCount: bigint
      }>>`
        SELECT 
          u.id as userId,
          u.name as userName,
          COUNT(*) as claimedCount
        FROM user u
        JOIN (
          SELECT claimerId, claimedAt FROM single_code_claim WHERE isClaimed = true
          UNION ALL
          SELECT claimerId, claimedAt FROM multi_code_claim
        ) as all_claims ON u.id = all_claims.claimerId
        WHERE all_claims.claimedAt >= ${startDate}
        GROUP BY u.id, u.name
        ORDER BY claimedCount DESC
        LIMIT 5
      `,
      
      // 热门标签
      prisma.$queryRaw<Array<{
        tagName: string,
        projectCount: bigint
      }>>`
        SELECT 
          pt.name as tagName,
          COUNT(pot.projectId) as projectCount
        FROM project_tag pt
        JOIN projects_on_tags pot ON pt.id = pot.tagId
        JOIN share_project p ON pot.projectId = p.id
        WHERE p.status = 'ACTIVE' AND p.isPublic = true
        GROUP BY pt.id, pt.name
        ORDER BY projectCount DESC
        LIMIT 10
      `
    ]);

    // 计算领取成功率
    const totalCodes = await prisma.singleCodeClaim.count();
    const claimRate = totalCodes > 0 ? (totalSingleClaims / totalCodes * 100) : 0;

    // 格式化趋势数据
    const formatTrendData = (data: Array<{date: string, count: bigint}>) => {
      return data.map(item => ({
        date: item.date,
        count: Number(item.count)
      }))
    }

    // 构建响应数据
    const stats = {
      overview: {
        totalUsers,
        newUsers,
        totalProjects,
        activeProjects,
        totalClaims: totalSingleClaims + totalMultiClaims,
        recentClaims: recentSingleClaims + recentMultiClaims,
        claimRate: Math.round(claimRate * 100) / 100,
        totalApplications,
        pendingApplications
      },
      
      userStats: {
        total: totalUsers,
        new: newUsers,
        linuxdo: linuxdoUsers,
        signup: totalUsers - linuxdoUsers,
        banned: bannedUsers
      },
      
      projectStats: {
        total: totalProjects,
        active: activeProjects,
        new: newProjects,
        byCategory: projectsByCategory.map(item => ({
          category: item.category,
          count: item._count.id
        })),
        byMode: projectsByMode.map(item => ({
          mode: item.distributionMode,
          count: item._count.id
        })),
        byStatus: projectsByStatus.map(item => ({
          status: item.status,
          count: item._count.id
        }))
      },
      
      claimStats: {
        single: totalSingleClaims,
        multi: totalMultiClaims,
        total: totalSingleClaims + totalMultiClaims,
        recent: recentSingleClaims + recentMultiClaims,
        rate: claimRate
      },
      
      applicationStats: {
        total: totalApplications,
        pending: pendingApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
        distribution: [
          { status: "PENDING", count: pendingApplications },
          { status: "APPROVED", count: approvedApplications },
          { status: "REJECTED", count: rejectedApplications }
        ]
      },
      
      trends: {
        users: formatTrendData(userTrend),
        projects: formatTrendData(projectTrend),
        claims: formatTrendData(claimTrend)
      },
      
      popular: {
        projects: popularProjects.map(p => ({
          ...p,
          claimedCount: Number(p.claimedCount)
        })),
        creators: activeCreators.map(c => ({
          ...c,
          projectCount: Number(c.projectCount),
          totalClaims: Number(c.totalClaims)
        })),
        claimers: activeClaimers.map(c => ({
          userId: c.userId,
          userName: c.userName,
          claimedCount: Number(c.claimedCount)
        })),
        tags: popularTags.map(t => ({
          ...t,
          projectCount: Number(t.projectCount)
        }))
      }
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error("获取仪表板统计数据失败:", error)
    return NextResponse.json(
      { success: false, error: "获取统计数据失败" },
      { status: 500 }
    )
  }
} 