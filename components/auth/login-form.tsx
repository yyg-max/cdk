'use client';

import { GalleryVerticalEnd } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { authClient } from "@/lib/auth-client"
import { useFormError } from "@/lib/hooks/useFormError"
import { ErrorDisplay } from "./error-display"
import { ErrorMessages } from "@/lib/types/auth"

/**
 * 登录表单组件属性接口
 */
interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {
  /**
   * 初始错误消息
   */
  initialError?: string | null;
}

/**
 * 登录表单组件
 * 
 * @param className - 组件CSS类名
 * @param initialError - 初始错误消息
 * @param props - 其他div元素属性
 */
export function LoginForm({
  className,
  initialError,
  ...props
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { error, setError } = useFormError(initialError);

  /**
   * 检查用户是否被禁用
   * 
   * @param email - 用户邮箱
   * @throws 如果用户被禁用则抛出错误
   */
  const checkUserBanned = async (email: string) => {
    const response = await fetch('/api/auth/check-banned', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || '检查账户状态失败');
    }
  };

  /**
   * 处理表单提交
   * 
   * @param e - 表单提交事件
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 先检查账户是否被禁用
      await checkUserBanned(email);
      
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe: true, // 默认记住登录状态
        callbackURL: '/dashboard'
      });
      
      if (error) {
        // 处理常见错误消息的中文翻译
        const errorMessages: ErrorMessages = {
          'Invalid email': '邮箱或密码错误',
          'Invalid email or password': '邮箱或密码错误',
          'Email not verified': '邮箱未验证',
          'Account is disabled': '账户已被禁用',
          'Too many attempts': '尝试次数过多，请稍后再试'
        };
        
        const chineseError = error.message ? (errorMessages[error.message] || error.message) : '登录失败';
        setError(chineseError);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: unknown) {
      // 断言error为Error类型以安全地访问message属性
      const errorObj = err as Error;
      const errorMessage = errorObj.message || '登录过程中发生错误';
      
      if (errorMessage.includes('Account is disabled')) {
        setError(errorMessage.replace('Account is disabled', '账户已被禁用'));
      } else {
        setError('登录过程中发生错误');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理Linux Do登录
   */
  const handleLinuxDoLogin = async (e: React.MouseEvent) => {
    e.preventDefault(); // 阻止默认行为
    e.stopPropagation(); // 阻止事件冒泡
    if (error) setError(null); // 清除错误
    try {
      await authClient.signIn.oauth2({
        providerId: "linuxdo",
        callbackURL: "/dashboard?sync=true", // 添加同步参数
      });
    } catch (err) {
      console.error('Linux Do 登录失败:', err);
      setError('Linux Do 登录失败，请重试');
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* 标题部分 */}
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/"
          className="flex flex-col items-center gap-2 font-medium"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-6" />
          </div>
        </Link>
        <h1 className="text-xl font-bold">欢迎使用 FastShare</h1>
      </div>

      {/* 第三方登录按钮 - 移到表单外面 */}
      <div className="grid gap-4">
        <Button 
          type="button"
          variant="outline" 
          className="w-full" 
          onClick={handleLinuxDoLogin}
        >
          <Image src="/linuxdo.png" alt="Linux Do" width={20} height={20} />
          使用 Linux Do 登陆
        </Button>
      </div>
      
      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">
          Or
        </span>
      </div>

      {/* 邮箱密码表单 */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null); // 清除错误
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            placeholder="****************"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null); // 清除错误
            }}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '登录中...' : '登录'}
        </Button>
        
        {/* 使用共享错误显示组件 */}
        <ErrorDisplay error={error} />
      </form>

      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary  ">
        登陆即表示您同意 FastShare 平台的 <a href="#">服务条款</a>{" "}
        和 <a href="#">隐私政策</a>
      </div>
      <div className="text-center text-sm">
        <p>
          还没有账户？{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            注册
          </Link>
        </p>
      </div>
    </div>
  )
}
