"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCategoryOptions } from "@/lib/constants"

interface BasicInfoFormData {
  name?: string
  description?: string
  category?: string
  selectedTags?: string[]
  usageUrl?: string
  totalQuota?: number
  tutorial?: string
}

interface BasicInfoProps {
  formData: BasicInfoFormData
  setFormData: (data: BasicInfoFormData) => void
}

// 从常量文件获取分类选项
const categories = getCategoryOptions()

const existingTags = [
  "AI工具", "开发工具", "设计软件", "学习资源", "娱乐游戏", "生活助手",
  "效率工具", "图像处理", "文本编辑", "数据分析", "网络工具", "系统工具"
]

export function BasicInfo({ formData, setFormData }: BasicInfoProps) {
  const [tagComboOpen, setTagComboOpen] = useState(false)
  const [tagSearchValue, setTagSearchValue] = useState("")

  const updateFormData = (field: string, value: string | number | string[] | undefined) => {
    setFormData({ ...formData, [field]: value })
  }

  const addTag = (tag: string) => {
    if (tag && !formData.selectedTags?.includes(tag)) {
      updateFormData("selectedTags", [...(formData.selectedTags || []), tag])
    }
    setTagSearchValue("")
    setTagComboOpen(false)
  }

  const removeTag = (tagToRemove: string) => {
    updateFormData("selectedTags", formData.selectedTags?.filter((tag: string) => tag !== tagToRemove) || [])
  }

  const createNewTag = () => {
    if (tagSearchValue.trim() && !existingTags.includes(tagSearchValue.trim())) {
      addTag(tagSearchValue.trim())
    }
  }

  const filteredTags = existingTags.filter(tag => 
    tag.toLowerCase().includes(tagSearchValue.toLowerCase()) &&
    !formData.selectedTags?.includes(tag)
  )

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
                onChange={(e) => updateFormData("name", e.target.value)}
                maxLength={16}
                className="h-10 pr-12 shadow-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {(formData.name || "").length}/16
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
                onChange={(e) => updateFormData("description", e.target.value)}
                maxLength={64}
                className="h-10 pr-12 shadow-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {(formData.description || "").length}/64
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
              onChange={(e) => updateFormData("usageUrl", e.target.value)}
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
                placeholder="50"
                value={formData.totalQuota || ""}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "") {
                    updateFormData("totalQuota", undefined)
                  } else {
                    const numValue = parseInt(value)
                    if (!isNaN(numValue) && numValue > 0) {
                      updateFormData("totalQuota", numValue)
                    }
                  }
                }}
                onBlur={() => {
                  if (!formData.totalQuota || formData.totalQuota <= 0) {
                    updateFormData("totalQuota", 50)
                  }
                }}
                className="h-10 pr-16 shadow-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                默认50
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
              onChange={(e) => updateFormData("tutorial", e.target.value)}
              maxLength={256}
              rows={4}
              className="resize-none pr-12 shadow-none"
            />
            <span className="absolute right-3 bottom-3 text-xs text-muted-foreground">
              {(formData.tutorial || "").length}/256
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
            <Select value={formData.category || "AI"} onValueChange={(value) => updateFormData("category", value)}>
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
            <Label className="text-sm font-medium">项目标签<span className="text-muted-foreground">（可选）</span></Label>
            <div className="space-y-2">
              {/* 已选标签 */}
              {(formData.selectedTags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.selectedTags?.map((tag: string) => (
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
                    搜索或添加标签...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="搜索标签..." 
                      value={tagSearchValue}
                      onValueChange={setTagSearchValue}
                    />
                    <CommandEmpty>
                      {tagSearchValue.trim() && (
                        <div className="p-2">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={createNewTag}
                          >
                            创建 &quot;{tagSearchValue.trim()}&quot;
                          </Button>
                        </div>
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredTags.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => addTag(tag)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.selectedTags?.includes(tag) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {tag}
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