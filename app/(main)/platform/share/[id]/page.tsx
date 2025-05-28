"use client"

import { useParams } from "next/navigation"
import { ShareInfo } from "@/components/platform/share/share-info"

export default function ProjectSharePage() {
  const params = useParams()
  const projectId = params.id as string

  return <ShareInfo projectId={projectId} />
} 