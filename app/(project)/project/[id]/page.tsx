"use client"

import { Metadata } from "next"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import ProjectEdit from "@/components/project/project-edit"
import { useSession } from "@/lib/auth-client"
import { toast } from "sonner"



export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const { data: session, isPending } = useSession()
  const [project, setProject] = useState<any>(null)
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
  }, [session, isPending, id])
  
  const fetchProjectDetails = async () => {
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
        
        const errorData = await response.json()
        
        if (response.status === 403) {
          throw new Error(errorData.error || "无权编辑此项目")
        }
        
        throw new Error(errorData.error || "获取项目详情失败")
      }
      
      const data = await response.json()
      
      // 判断是否为项目创建者
      if (!data.data.project.isCreator) {
        throw new Error("只有项目创建者才能编辑项目")
      }
      
      setProject(data.data.project)
    } catch (error: any) {
      console.error("获取项目详情失败:", error)
      setError(error.message || "获取项目详情失败")
      toast.error(error.message || "获取项目详情失败")
      
      // 3秒后跳转到dashboard
      setTimeout(() => {
        router.push('/dashboard')
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
