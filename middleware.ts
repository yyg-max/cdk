import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 需要身份验证的路径
  const protectedPaths = ['/dashboard', '/account', '/project', '/platform']
  
  // 检查当前路径是否需要保护
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  )

  if (isProtectedPath) {
    // 检查会话cookie是否存在
    const sessionCookie = getSessionCookie(request)

    if (!sessionCookie) {
      // 没有会话cookie，重定向到登录页面
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // 会话cookie存在，继续处理请求
    return NextResponse.next()
  }

  // 对于不需要保护的路径，直接继续
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下路径：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
} 