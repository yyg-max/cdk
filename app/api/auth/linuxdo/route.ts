import { NextResponse } from 'next/server';

// Linux Do OAuth2 配置
const CLIENT_ID = process.env.LINUXDO_CLIENT_ID || "LINUXDO_CLIENT_ID";
const REDIRECT_URI = `${process.env.BETTER_AUTH_URL}/api/auth/linuxdo/callback`;

export async function GET() {
  // 生成随机state参数用于安全验证
  const state = Math.random().toString(36).substring(2, 15);
  
  // 构建授权URL
  const authUrl = new URL('https://connect.linux.do/oauth2/authorize');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'read');
  authUrl.searchParams.set('state', state);
  
  // 将state存储在cookie中用于后续验证
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10分钟
  });
  
  return response;
} 