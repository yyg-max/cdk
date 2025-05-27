import { Metadata } from "next"

export const metadata: Metadata = {
  title: "项目详情",
  description: "查看和编辑项目详情",
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 