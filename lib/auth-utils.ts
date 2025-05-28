import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * 认证结果类型
 */
export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
  status?: number;
}

/**
 * 统一的用户认证中间件
 * 检查用户登录状态和账户状态
 * @param request - Next.js请求对象
 * @returns 认证结果
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    // 获取用户会话
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user?.id) {
      return {
        success: false,
        error: '用户未登录',
        status: 401
      };
    }

    const userId = session.user.id;

    // 检查用户是否被禁用
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { banned: true, banReason: true }
    });

    if (user?.banned) {
      return {
        success: false,
        error: `账户已被禁用${user.banReason ? `: ${user.banReason}` : ''}`,
        status: 403
      };
    }

    return {
      success: true,
      userId
    };
  } catch (error) {
    console.error('用户认证失败:', error);
    return {
      success: false,
      error: '认证过程中发生错误',
      status: 500
    };
  }
}

/**
 * 常用的错误消息映射
 */
export const AUTH_ERROR_MESSAGES = {
  'Invalid email': '邮箱或密码错误',
  'Invalid email or password': '邮箱或密码错误',
  'Email not verified': '邮箱未验证',
  'Account is disabled': '账户已被禁用',
  'Too many attempts': '尝试次数过多，请稍后再试',
  'Email already exists': '该邮箱已被注册',
  'Password too weak': '密码强度不够',
  'Invalid email format': '邮箱格式不正确',
  'Name is required': '请输入姓名',
} as const;

/**
 * 获取中文错误消息
 * @param errorMessage - 英文错误消息
 * @returns 中文错误消息
 */
export function getChineseErrorMessage(errorMessage?: string): string {
  if (!errorMessage) return '操作失败';
  
  return AUTH_ERROR_MESSAGES[errorMessage as keyof typeof AUTH_ERROR_MESSAGES] || errorMessage;
} 