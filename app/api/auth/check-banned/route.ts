import { NextRequest, NextResponse } from 'next/server';
import { checkUserBanned } from '@/lib/auth';
import { ErrorResponse } from '@/lib/types/auth';

/**
 * 检查用户是否被禁用的API
 * 
 * @param request - NextRequest请求对象
 * @returns NextResponse响应对象
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email as string;
    
    if (!email) {
      return NextResponse.json<ErrorResponse>(
        { error: '缺少邮箱参数' },
        { status: 400 }
      );
    }

    await checkUserBanned(email);
    return NextResponse.json({ allowed: true });
    
  } catch (error: unknown) {
    // 断言error为Error类型以安全地访问message属性
    const errorObj = error as Error;
    const errorMessage = errorObj.message || '未知错误';
    
    if (errorMessage.includes('Account is disabled')) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: errorMessage,
          banned: true 
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json<ErrorResponse>(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 