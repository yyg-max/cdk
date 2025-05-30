'use client';

import { AlertTriangle, GalleryVerticalEnd } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

export function SignupForm({
  className,
  initialError,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  initialError?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  // 当initialError变化时更新error状态
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  // 统一错误自动消失功能：3秒后自动消失
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  // 统一错误交互清除机制：点击页面、按ESC键都会清除
  useEffect(() => {
    const handleClickOutside = () => {
      if (error) {
        setError(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && error) {
        setError(null);
      }
    };

    if (error) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name
      });
      
      if (error) {
        // 处理常见错误消息的中文翻译
        const errorMessages: Record<string, string> = {
          'Email already exists': '该邮箱已被注册',
          'Password too weak': '密码强度不够',
          'Invalid email': '邮箱格式不正确',
          'Name is required': '请输入姓名',
        };
        
        const chineseError = error.message ? (errorMessages[error.message] || error.message) : '注册失败';
        setError(chineseError);
      } else {
        window.location.href = '/platform';
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '注册过程中发生错误';
      setError(errorMessage);
      console.error('注册失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
            </Link>
            <h1 className="text-xl font-bold">创建 Linux Do CDK 账户</h1>
            <p className="text-sm text-gray-500">请填写以下信息创建您的账户</p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                type="text"
                placeholder="请输入您的姓名"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null); // 清除错误
                }}
              />
            </div>
            
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
                placeholder="至少8个字符"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null); // 清除错误
                }}
                minLength={8}
              />
              <p className="text-xs text-gray-500">密码至少需要8个字符</p>
            </div>
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? '注册中...' : '注册'}
            </Button>
            
            {/* 错误提示容器 - 固定高度避免布局跳动 */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="p-2 bg-red-100 border border-red-200 text-red-700 rounded text-xs font-bold text-center flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4" /> {error || ''}
              </div>
            </div>
          </div>
        </div>
      </form>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary  ">
        注册即表示您同意 Linux Do CDK 平台的 <a href="#">服务条款</a>{" "}
        和 <a href="#">隐私政策</a>
      </div>
      <div className="text-center text-sm">
        <p>
          已有账户？{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
} 