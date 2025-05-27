import { PrismaClient } from '@prisma/client'

// 声明全局变量类型
declare global {
  var __prisma: PrismaClient | undefined
}

// 创建 Prisma 客户端单例
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

// 在开发环境中使用全局变量避免热重载时创建多个连接
// 在生产环境中直接创建新实例
const prisma = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

export { prisma }

// 导出一个清理函数，用于在应用关闭时断开连接
export const disconnectPrisma = async () => {
  await prisma.$disconnect()
}

// 导出一个健康检查函数
export const checkPrismaConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Prisma 连接检查失败:', error)
    return false
  }
}
