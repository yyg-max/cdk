"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  ColumnsIcon,
  SearchIcon,
} from "lucide-react"
import { toast } from "sonner"
import { DistributionMode } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// 定义领取记录数据结构
interface ClaimRecord {
  id: string
  projectId: string
  projectName: string
  projectDescription: string
  category: string
  distributionMode: DistributionMode
  content: string | null
  claimedAt: Date | null
  usageUrl: string | null
  tutorial: string | null
}

export function ClaimTable({ data = [] }: { data: ClaimRecord[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [showContent, setShowContent] = React.useState<Record<string, boolean>>({})
  const [codeContent, setCodeContent] = React.useState<Record<string, string>>({})
  const [loadingContent, setLoadingContent] = React.useState<Record<string, boolean>>({})
  const [openDialog, setOpenDialog] = React.useState<Record<string, boolean>>({})

  // 定义表格列
  const columns: ColumnDef<ClaimRecord>[] = [
    {
      accessorKey: "projectName",
      header: "项目名称",
      cell: ({ row }) => (
        <div className="font-medium pl-4">{row.getValue("projectName")}</div>
      ),
    },
    {
      accessorKey: "category",
      header: "分类",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "distributionMode",
      header: "分发模式",
      cell: ({ row }) => {
        const mode = row.getValue("distributionMode") as DistributionMode
        return (
          <Badge variant="secondary" className="capitalize">
            {mode === "SINGLE" ? "一码一用" : 
             mode === "MULTI" ? "一码多用" : "手动邀请"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "claimedAt",
      header: "领取时间",
      cell: ({ row }) => {
        const date = row.getValue("claimedAt") as Date
        return date ? new Date(date).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : "未知"
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const record = row.original
        const isLoading = loadingContent[record.id] || false
        const hasContent = codeContent[record.id] !== undefined
        const isVisible = showContent[record.id] || false
        
        return (
          <div className="flex items-center gap-2">
            <Dialog open={openDialog[record.id]} onOpenChange={(open) => {
              setOpenDialog(prev => ({ ...prev, [record.id]: open }))
              if (open) {
                handleFetchCode(record)
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                  <span className="sr-only">查看邀请码</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{record.projectName}</DialogTitle>
                  <DialogDescription>
                    {record.projectDescription || "该项目创建人未提供任何描述"}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md border px-4 py-3 font-mono text-sm relative w-full">
                        {hasContent ? (
                          isVisible ? codeContent[record.id] : "••••••••••••••••"
                        ) : "加载中..."}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(codeContent[record.id])}
                        disabled={!hasContent || !isVisible}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none mb-4">项目详情</h4>
                    <Button
                      variant="outline"
                      size="lg"
                      asChild
                    >
                      <a
                        href={`/platform/share/${record.projectId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 w-full"
                      >
                        <EyeIcon className="h-4 w-4" />
                        查看详情
                      </a>
                    </Button>
                  </div>
                  
                  {record.usageUrl && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">项目链接</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={record.usageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                            前往使用
                          </a>
                        </Button>
                      </div>
                    </>
                  )}
                  
                  {record.tutorial && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">使用教程</h4>
                        <div className="rounded-md border p-4 text-sm">
                          {record.tutorial}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )
      },
    },
  ]

  // 处理获取邀请码
  const handleFetchCode = React.useCallback(async (record: ClaimRecord) => {
    // 如果已经有内容或正在加载中，不需要重新获取
    if (codeContent[record.id] || loadingContent[record.id]) return
    
    setLoadingContent(prev => ({ ...prev, [record.id]: true }))
    
    try {
      // 单码领取直接显示内容
      if (record.distributionMode === DistributionMode.SINGLE && record.content) {
        setCodeContent(prev => ({ ...prev, [record.id]: record.content || "无内容" }))
        setShowContent(prev => ({ ...prev, [record.id]: true }))
        setLoadingContent(prev => ({ ...prev, [record.id]: false }))
        return
      }
      
      // 否则调用API获取
      const response = await fetch(`/api/myclaim/code?projectId=${record.projectId}&claimId=${record.id}&mode=${record.distributionMode}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.content) {
          setCodeContent(prev => ({ ...prev, [record.id]: data.content }))
          setShowContent(prev => ({ ...prev, [record.id]: true }))
        } else {
          toast.error(data.error || "获取邀请码失败")
          setCodeContent(prev => ({ ...prev, [record.id]: "无法获取内容" }))
        }
      } else {
        const error = await response.json()
        toast.error(error.error || "获取邀请码失败")
        setCodeContent(prev => ({ ...prev, [record.id]: "无法获取内容" }))
      }
    } catch (error) {
      console.error("获取邀请码出错:", error)
      toast.error("获取邀请码时出错")
      setCodeContent(prev => ({ ...prev, [record.id]: "获取出错" }))
    } finally {
      setLoadingContent(prev => ({ ...prev, [record.id]: false }))
    }
  }, [codeContent, loadingContent])
  
  // 复制到剪贴板
  const copyToClipboard = (text?: string) => {
    if (!text) return
    
    navigator.clipboard.writeText(text)
      .then(() => toast.success("已复制到剪贴板"))
      .catch(() => toast.error("复制失败"))
  }

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="搜索项目..."
            value={(table.getColumn("projectName")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("projectName")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <SearchIcon className="mr-2 h-4 w-4" /> 高级筛选
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="font-bold"
                onClick={() => table.getColumn("category")?.setFilterValue(null)}>
                全部分类
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => table.getColumn("category")?.setFilterValue("AI")}>
                AI
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => table.getColumn("category")?.setFilterValue("SOFTWARE")}>
                软件工具
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => table.getColumn("category")?.setFilterValue("GAME")}>
                游戏娱乐
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => table.getColumn("category")?.setFilterValue("EDUCATION")}>
                教育学习
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="font-bold"
                onClick={() => table.getColumn("distributionMode")?.setFilterValue(null)}>
                全部分发模式
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => table.getColumn("distributionMode")?.setFilterValue("SINGLE")}>
                一码一用
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => table.getColumn("distributionMode")?.setFilterValue("MULTI")}>
                一码多用
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => table.getColumn("distributionMode")?.setFilterValue("MANUAL")}>
                手动邀请
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              <ColumnsIcon className="mr-2 h-4 w-4" />
              显示列
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id === "projectName" ? "项目名称" : 
                     column.id === "category" ? "分类" :
                     column.id === "distributionMode" ? "分发模式" :
                     column.id === "claimedAt" ? "领取时间" : column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  暂无记录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          共 {table.getFilteredRowModel().rows.length} 条记录
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 