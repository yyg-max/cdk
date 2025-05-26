import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
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
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "linuxdo",
          clientId: process.env.LINUXDO_CLIENT_ID as string,
          clientSecret: process.env.LINUXDO_CLIENT_SECRET as string,
          authorizationUrl: "https://connect.linux.do/oauth2/authorize",
          tokenUrl: "https://connect.linux.do/oauth2/token",
          userInfoUrl: "https://connect.linux.do/api/user",
          scopes: ["read"],
          redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/linuxdo`,
          // 启用用户信息覆盖更新 - 每次登录时更新用户信息
          overrideUserInfo: true,
          // 自定义用户信息映射
          mapProfileToUser: (profile: any) => {
            return {
              id: profile.id.toString(),
              email: profile.email,
              name: profile.username,  // username作为系统用户名
              nickname: profile.name,  // name作为昵称显示
              image: profile.avatar_url,
              emailVerified: false,
              source: "linuxdo",
              trustLevel: profile.trust_level || 0,
              autoupdate: true, // 默认开启自动更新
            };
          },
        },
      ],
    }),
  ],
  user: {
    additionalFields: {
      nickname: {
        type: "string",
        required: false,
      },
      source: {
        type: "string",
        defaultValue: "signup",
      },
      trustLevel: {
        type: "number",
        required: false,
      },
      banned: {
        type: "boolean",
        defaultValue: false,
      },
      banReason: {
        type: "string",
        required: false,
      },
      autoupdate: {
        type: "boolean",
        defaultValue: false,
      },
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
