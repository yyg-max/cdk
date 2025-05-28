"use client"

import { useParams } from "next/navigation"
import { ShareInfo } from "@/components/platform/share/share-info"

// 这是一个客户端组件，所以元数据需要在布局文件中定义
export default function ProjectSharePage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <ShareInfo projectId={projectId} />
    </div>
  )
} 