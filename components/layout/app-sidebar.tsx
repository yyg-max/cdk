"use client"

import * as React from "react"
import {
  SquareArrowUpRight,
  BarChartIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ShoppingBag,
  SearchIcon,
  SettingsIcon,
  FileIcon,
} from "lucide-react"

import { NavDocuments } from "@/components/layout/nav-documents"
import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useSession } from "@/lib/auth-client"

const data = {
  navMain: [
    {
      title: "探索广场",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      title: "实时数据",
      url: "/dashboard",
      icon: BarChartIcon,
    },
    {
      title: "我的项目",
      url: "/project",
      icon: FolderIcon,
    },
    {
      title: "我的领取",
      url: "#",
      icon: ShoppingBag,
    }
  ],
  navSecondary: [
    {
      title: "账户设置",
      url: "/account",
      icon: SettingsIcon,
    },
    {
      title: "帮助中心",
      url: "#",
      icon: HelpCircleIcon,
    },
    {
      title: "功能搜索",
      url: "#",
      icon: SearchIcon,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: FileIcon,
    },
    {
      name: "Reports",
      url: "#",
      icon: FileIcon
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: FileIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, isPending } = useSession()

  // 如果正在加载会话数据，显示默认用户信息
  const userData = React.useMemo(() => {
    if (isPending || !session?.user) {
      return {
        name: "加载中...",
        email: "loading@example.com",
        avatar: "/avatars/default.svg",
      }
    }

    const user = session.user as any // 扩展类型以访问额外字段

    return {
      name: user.name || "未知用户",
      nickname: user.nickname || null, // 传递昵称字段
      email: user.email || "unknown@example.com",
      avatar: user.image || "/avatars/default.svg",
    }
  }, [session, isPending])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <SquareArrowUpRight className="h-5 w-5" />
                <span className="text-base font-semibold">FastShare</span>
                <span className="text-xs text-muted-foreground">v.0.0.1</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
