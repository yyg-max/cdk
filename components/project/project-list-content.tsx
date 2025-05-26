"use client"

import { useState, useEffect } from "react"
import { ProjectPreview } from "./project-preview"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Search, Filter } from "lucide-react"

interface Project {
  id: string
  name: string
  description: string
  category: string
  totalQuota: number
  distributionMode: "single" | "multi" | "manual"
  isPublic: boolean
  startTime: string
  endTime?: string
  requireLinuxdo: boolean
  minTrustLevel: number
  minRiskThreshold: number
  createdAt: string
  creator: {
    name: string
    image?: string
  }
  tag?: {
    name: string
  }
}

const PROJECT_CATEGORIES = [
  { value: "all", label: "全部分类" },
  { value: "ai", label: "人工智能" },
  { value: "software", label: "软件工具" },
  { value: "game", label: "游戏娱乐" },
  { value: "education", label: "教育学习" },
  { value: "resource", label: "资源分享" },
  { value: "life", label: "生活服务" },
  { value: "other", label: "其他" },
]

export function ProjectListContent() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [page, setPage] = useState(1)

  // 获取项目列表
  const fetchProjects = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "12",
        ...(category && category !== "all" && { category }),
        ...(search && { search }),
      })
      
      const response = await fetch(`/api/projects?${params}`)
      if (!response.ok) throw new Error("获取项目列表失败")
      
      const data = await response.json()
      setProjects(data.projects)
    } catch (error) {
      console.error("获取项目列表失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [page, category, search])

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  // 处理分类筛选
  const handleCategoryChange = (value: string) => {
    setCategory(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索项目名称或描述..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 项目列表 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectPreview
              key={project.id}
              data={{
                name: project.name,
                description: project.description,
                category: project.category,
                tags: project.tag ? [project.tag.name] : [],
                totalQuota: project.totalQuota,
                distributionMode: project.distributionMode,
                isPublic: project.isPublic,
                startTime: new Date(project.startTime),
                endTime: project.endTime ? new Date(project.endTime) : undefined,
                requireLinuxdo: project.requireLinuxdo,
                minTrustLevel: project.minTrustLevel,
                minRiskThreshold: project.minRiskThreshold,
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">暂无项目</h3>
              <p className="text-muted-foreground">
                {search || (category && category !== "all") ? "没有找到符合条件的项目" : "还没有任何项目，点击「新建项目」标签页创建第一个项目吧！"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 