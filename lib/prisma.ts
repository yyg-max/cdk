import { PrismaClient } from '@prisma/client'

// 创建 Prisma 客户端单例
const prisma = new PrismaClient({
  log: ['error'],
})

export { prisma }

// 导出一个清理函数，用于在应用关闭时断开连接
export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect()
}

// 导出一个健康检查函数
export const checkPrismaConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    if (error instanceof Error) {
      console.error('Prisma 连接检查失败:', error.message)
    } else {
      console.error('Prisma 连接检查失败:', error)
    }
    return false
  }
}
