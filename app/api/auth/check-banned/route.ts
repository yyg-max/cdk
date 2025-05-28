import { NextRequest, NextResponse } from 'next/server';
import { checkUserBanned } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: '缺少邮箱参数' },
        { status: 400 }
      );
    }

    await checkUserBanned(email);
    return NextResponse.json({ allowed: true });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    if (errorMessage.includes('Account is disabled')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          banned: true 
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 