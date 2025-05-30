"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import ProjectEdit from "@/components/project/project-edit"
import { useSession } from "@/lib/auth-client"
import { toast } from "sonner"
import type { Project } from "@/components/project/read/types"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const { data: session, isPending } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push(`/login?callbackUrl=/project/${id}`)
      return
    }
    
    if (session?.user && !project && !error) {
      fetchProjectDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isPending, id])
  
  const fetchProjectDetails = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/edit?id=${id}`, {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/404')
          return
        }
        
        let errorData: unknown
        try {
          errorData = await response.json()
        } catch {
          throw new Error("服务器响应格式无效")
        }
        
        if (response.status === 403) {
          const error = errorData && typeof errorData === 'object' && errorData !== null
            ? (errorData as Record<string, unknown>).error
            : "无权编辑此项目"
          throw new Error(typeof error === 'string' ? error : "无权编辑此项目")
        }
        
        const error = errorData && typeof errorData === 'object' && errorData !== null
          ? (errorData as Record<string, unknown>).error
          : "获取项目详情失败"
        throw new Error(typeof error === 'string' ? error : "获取项目详情失败")
      }
      
      let data: unknown
      try {
        data = await response.json()
      } catch {
        throw new Error("服务器响应格式无效")
      }
      
      // 安全类型断言
      if (!data || typeof data !== 'object' || data === null) {
        throw new Error("服务器响应数据无效")
      }
      
      const responseData = data as Record<string, unknown>
      
      if (!responseData.data || typeof responseData.data !== 'object' || responseData.data === null) {
        throw new Error("项目数据格式无效")
      }
      
      const projectData = (responseData.data as Record<string, unknown>).project as Project
      
      // 判断是否为项目创建者
      if (!projectData.isCreator) {
        throw new Error("只有项目创建者才能编辑项目")
      }
      
      setProject(projectData)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "获取项目详情失败"
      console.error("获取项目详情失败:", error)
      setError(errorMessage)
      toast.error(errorMessage)
      
      // 3秒后跳转到dashboard
      setTimeout(() => {
        router.push('/project')
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }
  
  if (isPending || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          加载中...
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <div className="text-gray-500">3秒后将自动跳转到主页...</div>
        </div>
      </div>
    )
  }
  
  if (!project) {
    return null
  }
  
  return (
    <ProjectEdit project={project} />
  )
}
