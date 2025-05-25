import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Linux Do OAuth2 配置
const CLIENT_ID = process.env.LINUXDO_CLIENT_ID || "LINUXDO_CLIENT_ID";
const CLIENT_SECRET = process.env.LINUXDO_CLIENT_SECRET || "LINUXDO_CLIENT_SECRET";
const REDIRECT_URI = `${process.env.BETTER_AUTH_URL}/api/auth/linuxdo/callback`;
const TOKEN_URL = "https://connect.linux.do/oauth2/token";
const USER_INFO_URL = "https://connect.linux.do/api/user";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // 检查是否有错误
  if (error) {
    return NextResponse.redirect(`${process.env.BETTER_AUTH_URL}/login?error=oauth_error`);
  }

  // 验证state参数
  const storedState = request.cookies.get('oauth_state')?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${process.env.BETTER_AUTH_URL}/login?error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.BETTER_AUTH_URL}/login?error=no_code`);
  }

  try {
    // 交换授权码获取访问令牌
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 使用访问令牌获取用户信息
    const userResponse = await fetch(USER_INFO_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userData = await userResponse.json();

    // 首先通过Account表查找是否已有Linux Do账户关联
    const existingAccount = await prisma.account.findFirst({
      where: {
        providerId: 'linuxdo',
        accountId: userData.id.toString()
      },
      include: {
        user: true
      }
    });

    let existingUser = existingAccount?.user || undefined;

    // 如果没有找到关联账户，再通过邮箱查找用户（可能是邮箱注册后首次使用Linux Do登录）
    if (!existingUser) {
      existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      }) || undefined;
    }

    // 检查用户是否被禁用
    if (existingUser?.banned) {
      return NextResponse.redirect(`${process.env.BETTER_AUTH_URL}/login?error=account_disabled`);
    }

    let user;
    
    if (existingUser) {
      // 准备更新数据
      const updateData: {
        name: string;
        image: string;
        trustLevel: number;
        source: string;
        email?: string;
      } = {
        name: userData.username, // Linux Do的用户名
        image: userData.avatar_url,
        trustLevel: userData.trust_level || 0,
        source: 'linuxdo',
      };

      // 根据邮箱验证状态决定是否更新邮箱
      // 如果邮箱未验证，每次Linux Do登录都会更新name、email、image
      // 如果邮箱已验证，只更新name和image
      if (!existingUser.emailVerified) {
        updateData.email = userData.email;
        console.log(`更新未验证用户 ${existingUser.id} 的邮箱从 ${existingUser.email} 到 ${userData.email}`);
      }

      // 更新现有用户信息
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
      });

      // 如果没有Account记录，创建一个
      if (!existingAccount) {
        await prisma.account.create({
          data: {
            id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            accountId: userData.id.toString(),
            providerId: 'linuxdo',
            userId: user.id,
            accessToken: accessToken,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      } else {
        // 更新访问令牌
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: accessToken,
            updatedAt: new Date(),
          },
        });
      }
    } else {
      // 检查用户名是否已被使用
      const existingUsername = await prisma.user.findUnique({
        where: { name: userData.username }
      });

      if (existingUsername) {
        return NextResponse.redirect(`${process.env.BETTER_AUTH_URL}/login?error=username_conflict`);
      }

      // 生成新的用户ID
      const userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // 创建新用户
      user = await prisma.user.create({
        data: {
          id: userId,
          name: userData.username, // Linux Do的用户名（唯一）
          email: userData.email,
          emailVerified: false, // Linux Do用户邮箱也需要验证
          source: 'linuxdo',
          image: userData.avatar_url,
          trustLevel: userData.trust_level || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 创建Account记录关联Linux Do账户
      await prisma.account.create({
        data: {
          id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          accountId: userData.id.toString(),
          providerId: 'linuxdo',
          userId: user.id,
          accessToken: accessToken,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // 创建会话token
    const sessionToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000); // 7天后过期

    // 创建会话记录
    await prisma.session.create({
      data: {
        id: sessionToken,
        token: sessionToken,
        userId: user.id,
        expiresAt: expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // 设置会话cookie并重定向
    const response = NextResponse.redirect(`${process.env.BETTER_AUTH_URL}/dashboard`);
    
    // 清除OAuth state cookie
    response.cookies.delete('oauth_state');
    
    // 设置会话cookie
    response.cookies.set('better-auth.session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
    });

    return response;

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.BETTER_AUTH_URL}/login?error=server_error`);
  }
} 