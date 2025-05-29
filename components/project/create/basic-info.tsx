"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCategoryOptions } from "@/lib/constants"
import { BasicInfoProps, ProjectCategoryType, CreateProjectTag } from "./types"
import { toast } from "sonner"

// 从常量文件获取分类选项
const categories = getCategoryOptions()

/**
 * 基本信息配置组件
 * 用于项目创建流程中的基本信息设置
 * 
 * @param formData - 表单数据
 * @param setFormData - 表单数据更新函数
 */
export function BasicInfo({ formData, setFormData }: BasicInfoProps) {
  const [tagComboOpen, setTagComboOpen] = useState(false)
  const [tagSearchValue, setTagSearchValue] = useState("")
  const [tags, setTags] = useState<CreateProjectTag[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  /**
   * 更新表单字段值
   * @param field - 字段名
   * @param value - 字段值
   */
  const updateField = <K extends keyof typeof formData>(
    field: K, 
    value: typeof formData[K]
  ) => {
    setFormData({ [field]: value })
  }

  /**
   * 从数据库获取所有标签
   */
  useEffect(() => {
    const fetchTags = async (): Promise<void> => {
      setIsLoadingTags(true)
      try {
        const response = await fetch('/api/tags')
        if (!response.ok) {
          throw new Error('获取标签失败')
        }
        const data: { tags: CreateProjectTag[] } = await response.json()
        setTags(data.tags || [])
      } catch (error) {
        console.error('获取标签出错:', error)
        toast.error('获取标签列表失败')
      } finally {
        setIsLoadingTags(false)
      }
    }

    fetchTags()
  }, [])

  /**
   * 创建新标签
   */
  const createNewTag = async (): Promise<void> => {
    if (!tagSearchValue.trim()) return
    
    // 检查是否已存在
    if (tags.some(tag => tag.name.toLowerCase() === tagSearchValue.trim().toLowerCase())) {
      toast.error('标签已存在')
      return
    }

    setIsCreatingTag(true)
    try {
      const response = await fetch('/api/tags/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: tagSearchValue.trim() }),
      })

      if (!response.ok) {
        const errorData: unknown = await response.json()
        
        // 安全断言错误数据
        if (typeof errorData === 'object' && errorData !== null) {
          const typedError = errorData as { tag?: CreateProjectTag; error?: string }
        
        // 处理已存在标签的特殊情况（可能是并发创建）
          if (response.status === 409 && typedError.tag) {
            addTag(typedError.tag.name)
            toast.info('该标签已存在，已为你自动选择')
            return
        }
        
          throw new Error(typedError.error || '创建标签失败')
        }
        
        throw new Error('创建标签失败')
      }

      const data: { tag: CreateProjectTag } = await response.json()
      
      // 添加新标签到列表
      const newTag = data.tag
      setTags(prev => [...prev, newTag])
      
      // 添加到已选标签
      addTag(newTag.name)
      
      // 不关闭弹出框，保持显示状态
      setTagComboOpen(true)
      
      // 清空搜索值，但保持弹出框打开
      setTagSearchValue("")
      
      toast.success('创建标签成功')
    } catch (error) {
      console.error('创建标签出错:', error)
      const errorMessage = error instanceof Error ? error.message : '创建标签失败'
      toast.error(errorMessage)
    } finally {
      setIsCreatingTag(false)
    }
  }

  /**
   * 添加标签到已选列表
   * @param tagName - 标签名称
   */
  const addTag = (tagName: string): void => {
    if (tagName && !formData.selectedTags?.includes(tagName)) {
      updateField("selectedTags", [...(formData.selectedTags || []), tagName])
    }
    // 不再在这里关闭弹出框，让用户可以继续添加标签
    setTagSearchValue("")
  }

  /**
   * 从已选列表中移除标签
   * @param tagToRemove - 要移除的标签名称
   */
  const removeTag = (tagToRemove: string): void => {
    updateField("selectedTags", formData.selectedTags?.filter(tag => tag !== tagToRemove) || [])
  }

  // 过滤可选标签（排除已选择的）
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(tagSearchValue.toLowerCase()) &&
    !formData.selectedTags?.includes(tag.name)
  )

  // 计算字段长度，带默认值处理
  const nameLength = (formData.name || "").length
  const descriptionLength = (formData.description || "").length
  const tutorialLength = (formData.tutorial || "").length

  return (
    <div className="space-y-4">
      {/* 基本信息区域 */}
      <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
        {/* 第一行：项目名称、项目描述 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              项目名称 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="项目名称"
                value={formData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                maxLength={16}
                className="h-10 pr-12 shadow-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {nameLength}/16
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              项目描述<span className="text-muted-foreground">（可选）</span>
            </Label>
            <div className="relative">
              <Input
                id="description"
                placeholder="简要描述你的项目"
                value={formData.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                maxLength={64}
                className="h-10 pr-12 shadow-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {descriptionLength}/64
              </span>
            </div>
          </div>
        </div>

        {/* 第二行：使用地址、分配名额 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="usageUrl" className="text-sm font-medium">使用地址<span className="text-muted-foreground">（可选）</span></Label>
            <Input
              id="usageUrl"
              type="url"
              placeholder="https://example.com"
              value={formData.usageUrl || ""}
              onChange={(e) => updateField("usageUrl", e.target.value)}
              className="h-10 shadow-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalQuota" className="text-sm font-medium">
              分配名额 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="totalQuota"
                type="number"
                min="1"
                max="1000"
                placeholder="10"
                value={formData.totalQuota || ""}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "") {
                    updateField("totalQuota", undefined)
                  } else {
                    const numValue = parseInt(value)
                    if (!isNaN(numValue) && numValue > 0) {
                      updateField("totalQuota", numValue)
                    }
                  }
                }}
                onBlur={() => {
                  if (!formData.totalQuota || formData.totalQuota <= 0) {
                    updateField("totalQuota", 10)
                  }
                }}
                className="h-10 pr-16 shadow-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                默认10
              </span>
            </div>
          </div>
        </div>

        {/* 第三行：使用教程 */}
        <div className="space-y-2">
          <Label htmlFor="tutorial" className="text-sm font-medium">使用教程<span className="text-muted-foreground">（可选）</span></Label>
          <div className="relative">
            <Textarea
              id="tutorial"
              placeholder="详细说明如何使用你的项目..."
              value={formData.tutorial || ""}
              onChange={(e) => updateField("tutorial", e.target.value)}
              maxLength={256}
              rows={4}
              className="h-48 pr-12 shadow-none"
            />
            <span className="absolute right-3 bottom-3 text-xs text-muted-foreground">
              {tutorialLength}/256
            </span>
          </div>
        </div>
      </div>

      {/* 分类标签区域 */}
      <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            项目分类 <span className="text-red-500">*</span>
          </Label>
          <Select 
            value={formData.category || "AI"} 
            onValueChange={(value) => updateField("category", value as ProjectCategoryType)}
          >
            <SelectTrigger className="h-10 shadow-none">
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              项目标签<span className="text-muted-foreground">（可选）</span>
            </Label>
            {(formData.selectedTags?.length ?? 0) > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateField("selectedTags", [])}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                清空已选
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {/* 已选标签 */}
            {(formData.selectedTags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {formData.selectedTags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="h-6 px-2 text-xs">
                    {tag}
                    <X 
                      className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            
            {/* 标签选择器 */}
            <Popover open={tagComboOpen} onOpenChange={setTagComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tagComboOpen}
                  className="h-10 w-full justify-between text-muted-foreground shadow-none"
                >
                  {isLoadingTags ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      正在加载标签...
                    </span>
                  ) : (
                    <div className="flex justify-between w-full">
                      <span>搜索或创建标签...</span>
                      <span className="flex items-center gap-2">
                        {(formData.selectedTags?.length ?? 0) > 0 && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            已选 {formData.selectedTags?.length}
                          </Badge>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </span>
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="搜索或创建标签..." 
                    value={tagSearchValue}
                    onValueChange={setTagSearchValue}
                  />
                  <CommandEmpty>
                    {tagSearchValue.trim() ? (
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={createNewTag}
                          disabled={isCreatingTag}
                        >
                          {isCreatingTag ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              正在创建...
                            </>
                          ) : (
                            <>创建 &quot;{tagSearchValue.trim()}&quot;</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="py-3 px-2 text-center text-sm text-muted-foreground">
                        {tags.length > 0 ? (
                          <div className="space-y-1">
                            <p>没有搜索结果</p>
                            <p>清空搜索框可查看所有可用标签</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p>暂无标签</p>
                            <p>输入文字创建第一个标签</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => addTag(tag.name)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.selectedTags?.includes(tag.name) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  )
} 