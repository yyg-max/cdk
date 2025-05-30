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
import { RollingText } from '@/components/animate-ui/text/rolling';
import { Badge } from "@/components/ui/badge";

// 定义扩展的用户类型接口
interface ExtendedUser {
  name?: string;
  email?: string;
  image?: string;
  nickname?: string;
}

// 匹配NavUser组件期望的类型
interface UserData {
  name: string;
  nickname?: string;
  email: string;
  avatar: string;
}

const data = {
  navMain: [
    {
      title: "探索广场",
      url: "/platform",
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
      url: "/myclaim",
      icon: ShoppingBag,
    }
  ],
  navSecondary: [
    {
      title: "账户设置",
      url: "/account",
      icon: SettingsIcon,
    },
    // {
    //   title: "帮助中心",
    //   url: "/help",
    //   icon: HelpCircleIcon,
    // },
    // {
    //   title: "功能搜索",
    //   url: "#",
    //   icon: SearchIcon,
    // },
  ],
  documents: [
    {
      name: "测试数据1",
      url: "#",
      icon: FileIcon,
    },
    {
      name: "测试数据2",
      url: "#",
      icon: FileIcon
    },
    {
      name: "测试数据3",
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

    const user = session.user as ExtendedUser

    return {
      name: user.name || "未知用户",
      nickname: user.nickname,
      email: user.email || "unknown@example.com",
      avatar: user.image || "/avatars/default.svg",
    }
  }, [session, isPending]) as UserData

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 p-0"
            >
              <a href="#">
                <SquareArrowUpRight className="h-5 w-5" />
                <RollingText 
                  className="text-base font-semibold" 
                  text="Linux Do CDK" 
                  loop={true} 
                  loopDelay={6000}
                  inViewOnce={false}
                  transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                />
                <span className="text-xs text-muted-foreground">v 0.0.1 - Beta</span>
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
