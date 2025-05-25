import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7天 (秒)
    updateAge: 60 * 60 * 24, // 每天更新一次会话
  },
  emailAndPassword: {
    enabled: true,
    // 可选：配置密码重置功能
    sendResetPassword: async ({ user, url }) => {
      // 这里实现发送重置密码邮件的逻辑
      console.log(`重置密码链接: ${url} 给用户: ${user.email}`);
    },
  },
  // 可选：配置邮箱验证
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // 这里实现发送验证邮件的逻辑
      console.log(`验证邮箱链接: ${url} 给用户: ${user.email}`);
    },
  },
});

// 导出用于管理用户禁用状态的函数
export async function banUser(userId: string, reason?: string) {
  return await prisma.user.update({
    where: { id: userId },
    data: { 
      banned: true,
      banReason: reason 
    }
  });
}

export async function unbanUser(userId: string) {
  return await prisma.user.update({
    where: { id: userId },
    data: { 
      banned: false,
      banReason: null 
    }
  });
}

export async function checkUserBanned(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { banned: true, banReason: true }
  });
  
  if (user?.banned) {
    throw new Error(`Account is disabled${user.banReason ? `: ${user.banReason}` : ''}`);
  }
  
  return user;
}
