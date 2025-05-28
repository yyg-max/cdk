# FastShare 认证系统开发文档

## 概述

FastShare 使用 Better-Auth 作为认证框架，支持邮箱密码登录和 Linux Do OAuth 登录。系统采用安全的会话管理和用户状态检查机制。

## 技术栈

- **认证框架**: Better-Auth
- **数据库**: MySQL (通过 Prisma)
- **前端框架**: Next.js 14 + React
- **UI组件**: ShadcnUI
- **类型安全**: TypeScript

## 项目结构

```
├── lib/
│   ├── auth.ts                 # Better-Auth 配置
│   ├── auth-client.ts          # 客户端认证工具
│   ├── auth-utils.ts           # 认证工具函数
│   └── constants.ts            # 项目常量配置
├── components/
│   ├── auth/
│   │   ├── login-form.tsx      # 登录表单组件
│   │   └── signup-form.tsx     # 注册表单组件
│   ├── account/
│   │   ├── BasicInfo.tsx       # 基本信息管理组件
│   │   ├── LinuxDoAuth.tsx     # Linux Do 认证管理组件
│   │   ├── PasswordSecurity.tsx # 密码安全管理组件
│   │   └── types.ts            # 账户模块类型定义
│   ├── platform/
│   │   ├── category-carousel.tsx   # 分类轮播组件
│   │   ├── project-card.tsx        # 项目卡片组件
│   │   ├── search-bar.tsx          # 搜索筛选组件
│   │   └── welcome-banner.tsx      # 欢迎横幅组件
│   └── project/
│       ├── project-create.tsx  # 项目创建主组件
│       ├── project-edit.tsx    # 项目编辑主组件
│       ├── project-list.tsx    # 项目查看主组件（列表）
│       ├── create/
│       │   ├── basic-info.tsx          # 基本信息配置组件
│       │   ├── distribution-content.tsx # 分发内容配置组件
│       │   ├── claim-restrictions.tsx  # 领取限制配置组件
│       │   └── types.ts               # 项目创建模块类型定义
│       ├── edit/
│       │   ├── basic-info.tsx          # 基本信息编辑组件
│       │   ├── distribution-content.tsx # 分发内容编辑组件
│       │   ├── claim-restrictions.tsx  # 领取限制编辑组件
│       │   └── types.ts               # 项目编辑模块类型定义
│       └── read/
│           ├── project-info.tsx        # 项目详情查看组件
│           └── types.ts               # 项目查看模块类型定义
├── providers/
│   └── platform-provider.tsx  # 探索广场数据状态管理
├── hooks/
│   └── use-platform-data.ts   # 探索广场数据获取Hook
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx      # 登录页面
│   │   └── signup/page.tsx     # 注册页面
│   ├── (main)/
│   │   ├── account/page.tsx    # 账户设置页面
│   │   ├── platform/
│   │   │   └── page.tsx        # 探索广场主页
│   │   ├── project/
│   │   │   ├── layout.tsx      # 项目模块布局
│   │   │   ├── page.tsx        # 项目管理主页（包含项目列表和创建）
│   │   │   ├── [id]/page.tsx   # 项目编辑页面
│   │   │   └── error/page.tsx  # 项目错误页面
│   │   └── dashboard/page.tsx  # 项目列表页面
│   └── api/
│       ├── auth/
│       │   ├── [...all]/route.ts       # Better-Auth API 路由
│       │   ├── check-banned/route.ts   # 用户禁用状态检查
│       │   └── update-profile/route.ts # Linux Do 用户资料更新
│       ├── account/
│       │   ├── basic/route.ts          # 基本信息更新 API
│       │   ├── autoupdate/route.ts     # 自动同步设置 API
│       │   └── password/
│       │       ├── route.ts            # 密码修改 API
│       │       └── check/route.ts      # 密码状态检查 API
│       ├── projects/
│       │   ├── create/route.ts         # 项目创建 API
│       │   ├── edit/route.ts           # 项目编辑 API
│       │   ├── search/route.ts         # 项目搜索 API
│       │   ├── status/route.ts         # 项目状态 API
│       │   └── delete/route.ts         # 项目删除 API
│       └── tags/
│           ├── route.ts                # 标签获取 API
│           └── create/route.ts         # 标签创建 API
```

## 环境变量

```env
# Better-Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key

# Linux Do OAuth
LINUXDO_CLIENT_ID=your-client-id
LINUXDO_CLIENT_SECRET=your-client-secret

# 数据库
DATABASE_URL=mysql://user:password@localhost:3306/database
```

## 账户设置模块

### 组件功能

#### BasicInfo.tsx - 基本信息管理
- **功能**: 用户基本信息的查看和编辑
- **字段**: 用户名、昵称、邮箱、头像链接
- **特性**: 实时表单验证、邮箱唯一性检查、头像URL格式验证

#### LinuxDoAuth.tsx - Linux Do 认证管理
- **功能**: Linux Do 账户绑定和信息同步
- **特性**: 自动同步开关、手动信息同步、信任等级显示
- **权限**: 仅 Linux Do 用户可使用完整功能

#### PasswordSecurity.tsx - 密码安全管理
- **功能**: 密码设置和修改
- **场景**: 
  - 第三方用户首次设置密码
  - 已有密码用户修改密码
- **验证**: 当前密码验证、新密码强度检查

## Share 项目页面路由

### 页面结构概述

项目模块采用 Next.js 13+ App Router 结构，提供了完整的项目管理功能，包括项目列表、创建、编辑和错误处理。

### 页面详细说明

#### app/(main)/project/layout.tsx - 项目模块布局
- **功能**: 为项目模块提供统一的布局和元数据
- **特性**:
  - 设置页面标题和描述
  - 简洁的通透布局设计
  - 支持嵌套路由

#### app/(main)/project/page.tsx - 项目管理主页
- **功能**: 项目管理的主入口页面
- **特性**:
  - **双标签页设计**: 
    - "所有项目"标签：显示用户创建的所有项目列表
    - "新建项目"标签：提供项目创建功能
  - **统一的用户界面**: 采用 animate-ui 的 Tabs 组件
  - **响应式布局**: 适配不同屏幕尺寸
- **组件集成**:
  - `ProjectList`: 项目列表展示和管理
  - `ProjectCreate`: 项目创建向导

#### app/(main)/project/[id]/page.tsx - 项目编辑页面
- **功能**: 单个项目的详细编辑页面
- **访问控制**:
  - 用户认证检查：未登录用户重定向到登录页
  - 权限验证：仅项目创建者可以访问编辑功能
  - 自动重定向：非创建者3秒后跳转到主页
- **数据处理**:
  - 动态路由参数解析
  - 实时项目数据获取
  - 类型安全的 API 响应处理
- **用户体验**:
  - 加载状态显示
  - 友好的错误提示
  - 自动页面跳转

#### app/(main)/project/error/page.tsx - 项目错误页面
- **功能**: 项目访问失败时的错误处理页面
- **错误处理**:
  - 权限不足提示
  - 项目不存在提示
  - 网络错误处理
- **用户操作**:
  - 重试按钮：重新尝试访问
  - 返回主页：安全的退出路径
- **设计特点**:
  - 清晰的错误图标
  - 友好的错误消息
  - 明确的操作指引

### 路由权限控制

#### 认证检查
- 所有项目页面都需要用户登录
- 未登录用户自动重定向到登录页面
- 支持登录后回调到原始页面

#### 权限验证
- 项目编辑页面仅限创建者访问
- 非创建者访问时显示友好错误提示
- 自动重定向到安全页面

#### 错误处理
- 统一的错误页面设计
- 详细的错误信息展示
- 多种恢复操作选项

## 探索广场模块

### 模块概述

探索广场(Platform)是 FastShare 的核心展示模块，为用户提供项目发现、搜索和浏览功能。该模块采用现代化的响应式设计，支持多维度的项目筛选和展示。

### 技术特点

- **统一状态管理**: 基于 React Context 的数据状态管理
- **类型安全**: 完全基于统一的类型系统，避免类型冲突
- **响应式设计**: 适配多种屏幕尺寸和设备
- **性能优化**: 分页加载、懒加载、重试机制等优化策略
- **用户体验**: 实时搜索、智能筛选、友好的错误处理

### 页面结构

#### app/(main)/platform/page.tsx - 探索广场主页
- **功能**: 项目发现和浏览的主入口页面
- **核心组件**:
  - `WelcomeBanner`: 欢迎横幅和特色项目轮播
  - `SearchFilterBar`: 搜索和筛选功能
  - `CategoryCarousel`: 按分类展示的项目轮播
- **数据管理**: 使用 `PlatformProvider` 提供统一的数据状态
- **特性**:
  - 无需用户登录即可访问
  - 实时数据更新和错误恢复
  - SEO 友好的静态内容结构

#### app/(main)/platform/category/[category]/page.tsx - 分类页面
- **功能**: 展示特定分类下的所有项目列表
- **路由参数**: `[category]` - 项目分类（AI、SOFTWARE、GAME等）
- **查询参数**: `page` - 页码（默认为1）
- **特性**:
  - **分页浏览**: 每页24个项目，支持页码导航
  - **分类验证**: 自动验证分类参数有效性
  - **响应式布局**: 适配不同屏幕尺寸的网格布局
  - **状态管理**: 加载状态、错误状态的友好展示
- **用户体验**:
  - 智能分页算法，优化页码按钮显示
  - 骨架屏加载效果
  - 错误重试机制

#### app/(main)/platform/share/[id]/page.tsx - 项目分享页面
- **功能**: 单个项目的详细信息展示和内容领取
- **路由参数**: `[id]` - 项目唯一标识符
- **核心组件**: `ShareInfo` - 项目分享信息组件
- **特性**:
  - **项目详情**: 完整的项目信息展示
  - **内容领取**: 支持密码保护的安全领取机制
  - **使用指南**: 集成使用教程和项目链接
  - **状态同步**: 已领取状态的持久化和同步

### 组件架构

#### components/platform/welcome-banner.tsx - 欢迎横幅组件
- **功能**: 平台欢迎信息和特色项目展示
- **特性**:
  - **轮播展示**: 平台统计信息 + 特色项目轮播
  - **自动切换**: 10秒自动轮播，支持手动控制
  - **响应式设计**: 移动端优化的布局和字体大小
  - **统计信息**: 总项目数、活跃项目、用户数、领取数
  - **项目详情**: 项目信息、创建者、进度、时间等
- **技术特点**:
  - 使用 `CarouselApi` 进行类型安全的轮播控制
  - 集成 `usePlatformContext` 获取数据
  - 支持多种项目状态的视觉展示

#### components/platform/category-carousel.tsx - 分类轮播组件
- **功能**: 按项目分类展示轮播项目列表
- **特性**:
  - **分类展示**: 按 AI、软件工具、游戏娱乐等分类组织
  - **项目轮播**: 每个分类支持水平滚动查看更多项目
  - **数量统计**: 显示每个分类的项目数量
  - **快速访问**: 支持"查看全部"链接跳转到分类页面
- **技术特点**:
  - 统一的 `ProjectCategory` 类型定义
  - 基于 Carousel 组件的轮播实现
  - 自动过滤空分类，优化用户体验

#### components/platform/project-card.tsx - 项目卡片组件
- **功能**: 单个项目的卡片式展示
- **展示内容**:
  - **项目基本信息**: 名称、描述、分类、标签
  - **创建者信息**: 头像、昵称、创建时间
  - **项目状态**: 分发模式、安全设置、领取进度
  - **视觉元素**: 渐变背景、状态指示器、图标标识
- **设计特点**:
  - **现代化 UI**: 卡片式设计，悬停动效
  - **信息密度**: 合理的信息层次和视觉引导
  - **状态展示**: 通过颜色和图标展示项目状态
  - **响应式**: 适配不同屏幕尺寸的布局调整

#### components/platform/search-bar.tsx - 搜索筛选组件
- **功能**: 项目搜索和多维度筛选
- **搜索功能**:
  - **关键词搜索**: 项目名称和描述的模糊匹配
  - **实时搜索**: 支持 Enter 键和按钮触发
  - **URL 同步**: 搜索状态与 URL 参数同步
- **筛选维度**:
  - **项目分类**: AI、软件工具、游戏娱乐等
  - **分发模式**: 一码一用、一码多用、手动邀请
  - **安全设置**: 密码保护、LinuxDo 认证、信任等级
  - **项目标签**: 多选标签筛选
- **用户体验**:
  - **分页加载**: 支持"加载更多"功能
  - **筛选计数**: 显示活跃筛选条件数量
  - **结果统计**: 显示搜索结果总数和当前显示数量
  - **清除功能**: 一键清除搜索和筛选条件

#### components/platform/share/share-info.tsx - 项目分享详情组件
- **功能**: 项目详细信息展示和内容领取处理
- **展示内容**:
  - **项目基本信息**: 名称、描述、分类、创建者、时间信息
  - **项目状态**: 领取进度、剩余名额、安全设置
  - **项目标签**: 标签列表展示
  - **领取界面**: 根据项目设置显示不同的领取方式
- **领取功能**:
  - **无密码领取**: 一键领取项目内容
  - **密码验证**: 输入密码后验证领取
  - **已领取状态**: 显示已领取的内容和使用方法
  - **使用指南**: 集成使用链接和教程展示
- **技术特点**:
  - **类型安全**: 完整的 unknown 类型断言和验证
  - **错误恢复**: 友好的错误处理和重试机制
  - **状态同步**: 领取状态的实时检查和更新
  - **响应式设计**: 适配移动端和桌面端的布局

### 数据管理架构

#### providers/platform-provider.tsx - 数据状态管理
- **功能**: 为整个探索广场模块提供统一的数据状态管理
- **提供数据**:
  - `stats`: 平台统计信息
  - `categories`: 分类数据和项目数量
  - `projectsByCategory`: 按分类组织的项目数据
  - `featuredProjects`: 特色项目列表
  - `isLoading`: 各种加载状态管理
  - `refreshData`: 数据刷新方法
- **设计优势**:
  - **避免 Props Drilling**: 组件直接通过 Context 获取数据
  - **统一数据源**: 所有组件使用相同的数据状态
  - **性能优化**: 数据在顶层获取一次，避免重复请求
  - **类型安全**: 完整的 TypeScript 类型定义

#### hooks/use-platform-data.ts - 数据获取Hook
- **功能**: 处理探索广场的所有数据获取逻辑
- **数据来源**:
  - `/api/projects/search`: 项目搜索和统计
  - 支持多种查询参数和筛选条件
  - 自动错误处理和重试机制
- **技术特点**:
  - **重试机制**: 网络失败时的指数退避重试
  - **错误恢复**: 友好的错误处理和默认数据提供
  - **并行请求**: 同时获取多种数据类型，提高加载效率
  - **状态管理**: 细粒度的加载状态控制

### API 接口

#### GET /api/projects/search - 项目搜索和数据获取 API
- **功能**: 提供探索广场的所有数据查询功能
- **支持操作**:
  - **项目搜索**: 关键词搜索、分页、排序
  - **统计数据**: 平台总体统计信息
  - **分类数据**: 各分类的项目数量统计
  - **项目列表**: 按条件筛选的项目列表
- **查询参数**:
  - `keyword`: 搜索关键词
  - `category`: 项目分类筛选
  - `status`: 项目状态筛选
  - `isPublic`: 公开性筛选
  - `limit`: 分页大小
  - `page`: 页码
  - `sortBy`: 排序字段
  - `sortOrder`: 排序方向
- **响应格式**:
  - 统一的成功/失败响应结构
  - 分页信息和总数统计
  - 类型安全的数据结构

### 类型系统

#### 统一类型定义
- **基础类型**: 基于 `@/components/project/read/types` 的 `Project` 接口
- **枚举类型**: 使用 Prisma 原生的 `ProjectCategory`、`DistributionMode`、`ProjectStatus`
- **扩展类型**: `StatsData`、`CategoryData` 等探索广场特有类型
- **组件属性**: 完整的 JSDoc 注释和类型约束

#### 类型安全保障
- **禁止 any**: 所有组件和函数都使用明确的类型定义
- **unknown 断言**: API 响应数据的安全类型转换
- **接口复用**: 避免重复定义，统一类型系统
- **JSDoc 注释**: 100% 的公共接口文档覆盖

## Share 项目创建模块

### 模块概述

Share 项目创建模块是 FastShare 的核心功能，允许用户创建和分享各类资源项目。该模块采用分步式表单设计，确保用户能够完整配置项目的各个方面。

### 技术特点

- **统一类型系统**: 基于 Prisma 原生类型，确保数据库一致性
- **类型安全**: 完全消除 `any` 类型，使用严格的 TypeScript 约束
- **组件化设计**: 模块化的组件结构，便于维护和扩展
- **完整文档**: 100% JSDoc 覆盖率，详细的函数和接口说明

### 组件架构

#### project-create.tsx - 主创建组件
- **功能**: 统一管理项目创建流程的所有步骤
- **特性**: 
  - 分步式表单导航
  - 实时验证状态显示
  - 统一的错误处理和用户反馈
  - 类型安全的表单数据管理

#### basic-info.tsx - 基本信息配置组件
- **功能**: 项目基本信息设置
- **字段**: 
  - 项目名称（必填，最多16字符）
  - 项目描述（可选，最多64字符）
  - 使用地址（可选，URL格式验证）
  - 分配名额（必填，1-1000范围）
  - 使用教程（可选，最多256字符）
  - 项目分类（必填，从预定义选项选择）
  - 项目标签（可选，支持搜索和创建）

#### distribution-content.tsx - 分发内容配置组件
- **功能**: 项目分发模式和内容配置
- **分发模式**:
  - **一码一用**: 每个邀请码只能使用一次，需要提供与名额相等的邀请码
  - **一码多用**: 单个邀请码可供多人使用，直到名额用完
  - **手动邀请**: 用户申请时需要回答问题，由创建者手动审核
- **配置选项**:
  - 公开显示设置
  - 领取密码（可选，至少6位）
  - 邀请码/链接管理
  - 申请问题设置（手动邀请模式）

#### claim-restrictions.tsx - 领取限制配置组件
- **功能**: 项目领取条件和时间限制设置
- **时间设置**:
  - 开始时间（必填，精确到秒）
  - 结束时间（可选，支持无期限）
  - 智能时间验证和冲突检测
- **用户限制**:
  - Linux Do 认证要求
  - 最低信任等级（0-4级）
  - 风控阈值（30-90，可视化滑块选择）

#### types.ts - 统一类型定义
- **核心特性**:
  - 导入 Prisma 原生枚举类型
  - 统一的组件属性接口体系
  - 泛型基础接口避免代码重复
  - 完整的 API 请求/响应接口定义
  - 严格的类型约束和 readonly 修饰符

### API 接口

#### POST /api/projects/create - 项目创建 API
- **功能**: 创建新的 Share 项目
- **认证**: 需要用户登录
- **数据验证**: 完整的表单数据验证
- **特性**:
  - 统一认证检查
  - 类型安全的请求数据处理
  - 批量邀请码创建优化
  - 项目标签关联管理
  - 详细的错误信息返回

#### GET /api/tags - 标签获取 API
- **功能**: 获取所有可用的项目标签
- **认证**: 需要用户登录
- **返回**: 按名称排序的标签列表

#### POST /api/tags/create - 标签创建 API
- **功能**: 创建新的项目标签
- **认证**: 需要用户登录
- **验证**: 标签名称唯一性检查
- **特性**: 并发创建处理，支持重复标签的友好提示

## Share 项目编辑模块

### 模块概述

Share 项目编辑模块允许项目创建者对已创建的项目进行更新和修改。该模块继承了创建模块的设计理念，提供了安全、类型化的编辑体验。

### 技术特点

- **类型继承**: 完全继承 read 模块的类型定义，确保数据一致性
- **权限控制**: 严格的创建者权限验证，确保只有项目创建者可以编辑
- **增量更新**: 支持部分字段更新，避免不必要的数据变更
- **版本兼容**: 向后兼容的 API 设计，支持新旧版本共存

### 组件架构

#### project-edit.tsx - 主编辑组件
- **功能**: 统一管理项目编辑流程
- **特性**:
  - 权限检查（非创建者自动重定向）
  - 分步式编辑界面
  - 实时表单验证
  - 类型安全的数据更新
  - 统一错误处理

#### edit/basic-info.tsx - 基本信息编辑组件
- **功能**: 项目基本信息的编辑
- **可编辑字段**:
  - 项目名称、描述、分类
  - 使用地址、使用教程
  - 项目状态（活跃、暂停、已完成、已过期）
- **限制**: 分发模式和公开性设置在创建后不可更改

#### edit/distribution-content.tsx - 分发内容编辑组件
- **功能**: 项目分发设置的编辑
- **可编辑内容**:
  - **密码管理**: 保持原密码、设置新密码、取消密码
  - **配额管理**: 支持新增配额（不可减少已分配的配额）
  - **邀请码管理**: 
    - 一码一用模式：批量添加新邀请码
    - 一码多用模式：更新通用邀请码
    - 手动邀请模式：修改申请问题
- **特性**:
  - 智能邀请码导入（支持多种格式）
  - 配额匹配验证
  - 原有数据保护

#### edit/claim-restrictions.tsx - 领取限制编辑组件
- **功能**: 项目领取限制的编辑
- **可编辑内容**:
  - **时间设置**: 开始时间、结束时间
  - **认证要求**: Linux Do 认证开关、最低信任等级
  - **风控设置**: 最低风险阈值
- **验证**: 时间冲突检测、认证等级有效性验证

#### edit/types.ts - 编辑模块类型定义
- **设计原则**:
  - 继承 read 模块的 Project 接口
  - 分离不同组件的表单数据接口
  - 统一的组件属性接口规范
  - 完整的 API 请求/响应类型定义

### API 接口

#### PUT /api/projects/edit - 项目编辑 API
- **功能**: 更新现有项目信息
- **认证**: 需要用户登录且为项目创建者
- **数据处理**:
  - 增量更新：只更新提供的字段
  - 配额验证：新增配额不能小于已领取数量
  - 邀请码处理：智能合并新旧邀请码
  - 密码处理：加密存储或安全移除
- **安全特性**:
  - 严格的所有权验证
  - 数据完整性检查
  - 类型安全的请求处理
  - 详细的操作日志

#### GET /api/projects/edit?id=project-id - 项目详情获取 API
- **功能**: 获取项目的完整编辑信息
- **权限控制**:
  - 创建者：返回包含敏感信息的完整数据
  - 非创建者：返回基本公开信息
- **数据处理**:
  - 实时计算领取统计数据
  - 安全的敏感信息过滤
  - 标准化的响应格式

## Share 项目查看模块

### 模块概述

Share 项目查看模块提供了项目详情的展示功能，采用现代化的 UI 设计，支持不同权限级别的信息展示。

### 技术特点

- **响应式设计**: 适配各种屏幕尺寸的展示效果
- **权限分级**: 根据用户身份显示不同级别的信息
- **实时数据**: 动态加载项目状态和领取记录
- **性能优化**: 分页加载、懒加载等性能优化技术

### 组件架构

#### read/project-info.tsx - 项目详情展示组件
- **功能**: 完整的项目信息展示
- **展示内容**:
  - **项目基本信息**: 名称、描述、分类、状态、标签
  - **项目统计**: 总配额、已领取、剩余名额、完成度
  - **领取记录**: 分页显示的领取历史记录
  - **安全设置**: 认证要求、风控设置、密码保护状态
  - **时间信息**: 项目开始/结束时间
  - **项目链接**: 使用地址、教程内容
- **交互功能**:
  - 分页加载更多领取记录
  - 一键打开项目链接
  - 响应式 Modal 弹窗展示

#### read/types.ts - 查看模块类型定义
- **核心接口**:
  - `Project`: 基于 Prisma 原生类型的项目接口
  - `ProjectTag`: 标签信息接口
  - `ProjectCreator`: 创建者信息接口
  - `ProjectClaimsData`: 领取数据统计接口
  - `ProjectClaim`: 单个领取记录接口
- **设计特点**:
  - 使用 Prisma 原生枚举类型
  - readonly 修饰符保护数据安全
  - 完整的 JSDoc 注释
  - 泛型组件属性接口

### API 接口

#### GET /api/projects/search - 项目搜索 API
- **功能**: 搜索和筛选项目列表
- **查询参数**:
  - 分页参数：页码、每页数量
  - 筛选条件：分类、状态、分发模式、标签
  - 排序方式：时间、名称、领取数量、状态
  - 搜索关键词：项目名称模糊搜索
- **特性**:
  - 智能状态排序（暂停→活跃→已过期→已完成）
  - 类型安全的查询参数处理
  - 高效的数据库查询优化
  - 统一的分页响应格式

#### GET /api/projects/status?projectId=xxx - 项目状态 API
- **功能**: 获取项目的详细状态信息
- **返回数据**:
  - 项目基本统计信息
  - 分页的领取记录列表
  - 待审核申请数量（手动邀请模式）
- **特性**:
  - 支持分页加载
  - 实时计算统计数据
  - 多种领取方式的统一处理

### 数据模型

项目查看和编辑模块涉及的主要数据模型：

```typescript
// 项目主表
ShareProject {
  id: string
  name: string
  description: string
  category: ProjectCategory
  distributionMode: DistributionMode
  status: ProjectStatus
  totalQuota: number
  claimedCount: number
  isPublic: boolean
  requireLinuxdo: boolean
  minTrustLevel: number
  minRiskThreshold: number
  startTime: Date
  endTime: Date | null
  usageUrl: string | null
  tutorial: string | null
  hasPassword: boolean
  inviteCodes: string | null
  question1: string | null
  question2: string | null
  createdAt: Date
  updatedAt: Date
  creatorId: string
}

// 项目标签关联
ProjectsOnTags {
  projectId: string
  tagId: string
  project: ShareProject
  tag: ProjectTag
}

// 一码一用记录
SingleCodeClaim {
  id: string
  projectId: string
  content: string
  contentHash: string
  isClaimed: boolean
  claimedAt: Date | null
  claimerId: string | null
  claimerName: string | null
}

// 一码多用记录
MultiCodeClaim {
  id: string
  projectId: string
  claimedAt: Date
  claimerId: string
  claimerName: string
}

// 手动申请记录
ManualApplication {
  id: string
  projectId: string
  applicantId: string
  applicantName: string
  answer1: string
  answer2: string | null
  status: ApplicationStatus
  appliedAt: Date
  reviewedAt: Date | null
}
```

### 开发规范

#### 类型安全要求
- **禁止使用 any**: 所有地方都使用明确的类型定义
- **安全处理 unknown**: API 响应数据使用 unknown + 安全断言
- **谨慎使用 never**: 仅在类型系统必要时使用

#### 代码复用原则
- **统一认证逻辑**: 使用 `authenticateUser` 中间件
- **共享类型定义**: 基于 Prisma 原生类型的统一系统
- **通用组件接口**: 泛型基础接口避免重复

#### 文档要求
- **JSDoc 注释**: 所有公共函数和接口必须有完整注释
- **参数说明**: 清晰的参数类型和用途说明
- **返回值说明**: 明确的返回值类型和含义
- **使用示例**: 复杂逻辑包含使用示例

#### API 设计规范
- **RESTful 规范**: 统一的 HTTP 状态码和响应格式
- **错误处理**: 详细的错误信息和用户友好的错误消息
- **数据验证**: 完整的输入数据验证和类型检查

## 开发注意事项

1. **类型安全**: 禁止使用 `any` 类型，使用 `unknown` 进行安全断言
2. **错误处理**: 使用 `getChineseErrorMessage` 统一错误消息
3. **认证检查**: 在需要认证的 API 中使用 `authenticateUser` 函数
4. **代码复用**: 避免重复的认证逻辑，使用统一的工具函数
5. **JSDoc 注释**: 在关键函数和复杂逻辑处添加完整的 JSDoc 注释
6. **组件设计**: 遵循单一职责原则，保持组件的可测试性和可维护性
7. **数据验证**: 前端和后端都要进行完整的数据验证
8. **用户体验**: 提供实时反馈和清晰的错误提示
9. **性能优化**: 合理使用分页、缓存、懒加载等技术
10. **安全考虑**: 严格的权限控制和敏感信息保护