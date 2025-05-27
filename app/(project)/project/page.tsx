import { ProjectCreate } from "@/components/project/project-create"
import ProjectList from "@/components/project/project-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CreateProjectPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            我的项目
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            查看和管理您的项目
          </p>
        </div>

        {/* Tab 导航 */}
        <Tabs defaultValue="all-projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="all-projects">所有项目</TabsTrigger>
            <TabsTrigger value="create-project">新建项目</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all-projects" className="space-y-6">
            <ProjectList />
          </TabsContent>
          
          <TabsContent value="create-project" className="space-y-6">
            <ProjectCreate />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
