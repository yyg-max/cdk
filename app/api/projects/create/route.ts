import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { auth } from "@/lib/auth"

const prisma = new PrismaClient()

// 请求数据类型定义
interface CreateProjectRequest {
  // 基本信息
  name: string
  description?: string
  category: string
  selectedTags?: string[]
  usageUrl?: string
  totalQuota: number
  tutorial?: string
  
  // 分发内容
  distributionMode: "single" | "multi" | "manual"
  isPublic: boolean
  claimPassword?: string
  inviteCodes?: string[]
  singleInviteCode?: string
  question1?: string
  question2?: string
  
  // 领取限制
  startTime: string // ISO 8601 格式
  endTime?: string | null
  requireLinuxdo: boolean
  minTrustLevel: number
  minRiskThreshold: number
}

// 生成邀请码哈希值
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

// 批量创建一码一用记录（优化版本）
async function createSingleCodeClaimsOptimized(projectId: string, inviteCodes: string[]) {
  // 预处理：生成哈希值和去重
  const uniqueCodes = [...new Set(inviteCodes)]
  const codeData = uniqueCodes.map(code => ({
    content: code,
    contentHash: generateContentHash(code),
    projectId: projectId,
    isClaimed: false
  }))

  // 批量插入（使用事务确保一致性）
  await prisma.$transaction(async (tx) => {
    // 检查是否有重复的哈希值
    const existingHashes = await tx.singleCodeClaim.findMany({
      where: {
        projectId: projectId,
        contentHash: {
          in: codeData.map(item => item.contentHash)
        }
      },
      select: { contentHash: true }
    })

    const existingHashSet = new Set(existingHashes.map(item => item.contentHash))
    const newCodeData = codeData.filter(item => !existingHashSet.has(item.contentHash))

    if (newCodeData.length > 0) {
      // 使用createMany进行批量插入
      await tx.singleCodeClaim.createMany({
        data: newCodeData,
        skipDuplicates: true
      })
    }
  })

  return uniqueCodes.length
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectRequest = await request.json()
    
    // 数据验证
    const validationError = validateProjectData(body)
    if (validationError) {
      return NextResponse.json(
        { error: "数据验证失败", details: validationError },
        { status: 400 }
      )
    }

    // 获取当前用户ID (这里需要根据你的认证系统调整)
    // 临时使用固定用户ID，实际应该从session或token中获取
    const creatorId = await getCurrentUserId(request)
    if (!creatorId) {
      return NextResponse.json(
        { error: "用户未登录或认证失败" },
        { status: 401 }
      )
    }

    // 处理标签
    let tagId: string | null = null
    if (body.selectedTags && body.selectedTags.length > 0) {
      // 使用第一个标签，如果有多个标签可以考虑其他处理方式
      const tagName = body.selectedTags[0]
      
      // 查找或创建标签
      let tag = await prisma.projectTag.findUnique({
        where: { name: tagName }
      })
      
      if (!tag) {
        tag = await prisma.projectTag.create({
          data: { name: tagName }
        })
      }
      
      tagId = tag.id
    }

    // 处理密码加密
    let hashedPassword: string | null = null
    if (body.claimPassword) {
      hashedPassword = await bcrypt.hash(body.claimPassword, 12)
    }

    // 处理邀请码数据
    let inviteCodesJson: string | null = null

    if (body.distributionMode === "single" && body.inviteCodes) {
      inviteCodesJson = JSON.stringify(body.inviteCodes)
    } else if (body.distributionMode === "multi" && body.singleInviteCode) {
      inviteCodesJson = JSON.stringify([body.singleInviteCode])
    }

    // 创建项目
    const project = await prisma.shareProject.create({
      data: {
        // 基本信息
        name: body.name,
        description: body.description || "",
        category: body.category,
        tagId: tagId,
        usageUrl: body.usageUrl,
        totalQuota: body.totalQuota,
        tutorial: body.tutorial,
        
        // 分发内容
        distributionMode: body.distributionMode,
        isPublic: body.isPublic,
        claimPassword: hashedPassword,
        inviteCodes: inviteCodesJson,
        question1: body.question1,
        question2: body.question2,
        
        // 领取限制
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        requireLinuxdo: body.requireLinuxdo,
        minTrustLevel: body.minTrustLevel,
        minRiskThreshold: body.minRiskThreshold,
        
        // 元数据
        creatorId: creatorId
      },
      include: {
        tag: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // 根据分发模式创建相应的记录
    if (body.distributionMode === "single" && body.inviteCodes) {
      // 一码一用：使用优化的批量创建方法
      const createdCount = await createSingleCodeClaimsOptimized(project.id, body.inviteCodes)
      console.log(`一码一用模式：已创建 ${createdCount} 个邀请码记录`)
    } 
    // 一码多用模式：邀请码存储在项目的inviteCodes字段中，用户领取时才创建MultiCodeClaim记录
    // 手动邀请模式：用户申请时才创建ManualApplication记录

    return NextResponse.json({
      success: true,
      message: "项目创建成功",
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        category: project.category,
        distributionMode: project.distributionMode,
        totalQuota: project.totalQuota,
        isPublic: project.isPublic,
        createdAt: project.createdAt,
        tag: project.tag,
        creator: project.creator
      }
    })

  } catch (error) {
    console.error("创建项目失败:", error)
    
    // 处理Prisma错误
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "项目名称已存在，请使用其他名称" },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// 数据验证函数
function validateProjectData(data: CreateProjectRequest): string | null {
  // 基本信息验证
  if (!data.name || data.name.trim().length === 0) {
    return "项目名称不能为空"
  }
  if (data.name.length > 16) {
    return "项目名称不能超过16个字符"
  }
  if (data.description && data.description.length > 64) {
    return "项目描述不能超过64个字符"
  }
  if (!data.category) {
    return "项目分类不能为空"
  }
  if (!data.totalQuota || data.totalQuota <= 0 || data.totalQuota > 1000) {
    return "分配名额必须在1-1000之间"
  }
  if (data.tutorial && data.tutorial.length > 256) {
    return "使用教程不能超过256个字符"
  }

  // 分发模式验证
  if (!["single", "multi", "manual"].includes(data.distributionMode)) {
    return "分发模式无效"
  }

  // 一码一用模式验证
  if (data.distributionMode === "single") {
    if (!data.inviteCodes || data.inviteCodes.length === 0) {
      return "一码一用模式必须提供邀请码"
    }
    if (data.inviteCodes.length !== data.totalQuota) {
      return `邀请码数量(${data.inviteCodes.length})必须等于分配名额(${data.totalQuota})`
    }
  }

  // 一码多用模式验证
  if (data.distributionMode === "multi") {
    if (!data.singleInviteCode || data.singleInviteCode.trim().length === 0) {
      return "一码多用模式必须提供邀请码"
    }
  }

  // 手动邀请模式验证
  if (data.distributionMode === "manual") {
    if (!data.question1 || data.question1.trim().length === 0) {
      return "手动邀请模式必须设置问题1"
    }
    if (data.question1.length > 16) {
      return "问题1不能超过16个字符"
    }
    if (data.question2 && data.question2.length > 16) {
      return "问题2不能超过16个字符"
    }
  }

  // 密码验证
  if (data.claimPassword && data.claimPassword.length < 6) {
    return "领取密码至少需要6位字符"
  }

  // 时间验证
  if (!data.startTime) {
    return "开始时间不能为空"
  }
  
  const startTime = new Date(data.startTime)
  if (isNaN(startTime.getTime())) {
    return "开始时间格式无效"
  }

  if (data.endTime) {
    const endTime = new Date(data.endTime)
    if (isNaN(endTime.getTime())) {
      return "结束时间格式无效"
    }
    if (endTime <= startTime) {
      return "结束时间必须晚于开始时间"
    }
  }

  // 信任等级验证
  if (data.requireLinuxdo) {
    if (![0, 1, 2, 3, 4].includes(data.minTrustLevel)) {
      return "信任等级必须在0-4之间"
    }
  }

  // 风控阈值验证
  if (!data.minRiskThreshold || data.minRiskThreshold < 50 || data.minRiskThreshold > 90) {
    return "风控阈值必须在50-90之间"
  }

  return null
}

// 使用Better Auth获取当前用户ID
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    // 使用Better Auth的getSession方法获取当前session
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    // 检查session是否存在且有效
    if (session?.user?.id) {
      // 检查用户是否被禁用
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { banned: true, banReason: true }
      })
      
      if (user?.banned) {
        console.log(`用户 ${session.user.id} 已被禁用: ${user.banReason || '无原因'}`)
        return null
      }
      
      return session.user.id
    }
    
    return null
    
  } catch (error) {
    console.error("获取用户session失败:", error)
    return null
  }
}
