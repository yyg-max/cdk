"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ProjectErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("项目页面错误:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-6">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-center mb-2">访问项目失败</h1>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        {error?.message || "无法访问项目，可能是权限不足或者项目不存在"}
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={reset} variant="outline">
          重试
        </Button>
        <Button asChild>
          <Link href="/platform">
            返回主页
          </Link>
        </Button>
      </div>
    </div>
  )
} 