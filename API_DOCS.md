# 创建项目 API 文档

## 接口信息

- **URL**: `/api/projects/create`
- **方法**: `POST`
- **Content-Type**: `application/json`

## 请求参数

### 基本信息
| 字段 | 类型 | 必填 | 长度限制 | 说明 |
|------|------|------|----------|------|
| name | string | ✅ | 1-16字符 | 项目名称 |
| description | string | ❌ | 0-64字符 | 项目描述 |
| category | string | ✅ | - | 项目分类 |
| selectedTags | string[] | ❌ | - | 项目标签数组 |
| usageUrl | string | ❌ | - | 使用地址 |
| totalQuota | number | ✅ | 1-1000 | 分配名额 |
| tutorial | string | ❌ | 0-256字符 | 使用教程 |

### 分发内容
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| distributionMode | string | ✅ | 分发模式: "single"(一码一用) / "multi"(一码多用) / "manual"(手动邀请) |
| isPublic | boolean | ✅ | 是否公开显示 |
| claimPassword | string | ❌ | 领取密码，至少6位字符 |
| inviteCodes | string[] | 条件必填 | 一码一用模式的邀请码数组，数量必须等于totalQuota |
| singleInviteCode | string | 条件必填 | 一码多用模式的邀请码 |
| question1 | string | 条件必填 | 手动邀请模式的问题1，最多16字符 |
| question2 | string | ❌ | 手动邀请模式的问题2，最多16字符 |

### 领取限制
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startTime | string | ✅ | 开始时间，ISO 8601格式 |
| endTime | string/null | ❌ | 结束时间，ISO 8601格式，null表示无期限 |
| requireLinuxdo | boolean | ✅ | 是否需要LinuxDo认证 |
| minTrustLevel | number | ✅ | 最低信任等级 0-4 |
| minRiskThreshold | number | ✅ | 风控阈值 50-90 |

## 请求示例

### 一码一用模式
```json
{
  "name": "AI工具分享",
  "description": "优秀的AI工具",
  "category": "人工智能",
  "selectedTags": ["AI工具", "效率工具"],
  "usageUrl": "https://example.com",
  "totalQuota": 2,
  "tutorial": "详细使用说明...",
  "distributionMode": "single",
  "isPublic": true,
  "claimPassword": "123456",
  "inviteCodes": ["code1", "code2"],
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": null,
  "requireLinuxdo": true,
  "minTrustLevel": 2,
  "minRiskThreshold": 80
}
```

### 一码多用模式
```json
{
  "name": "共享工具",
  "category": "软件工具",
  "totalQuota": 50,
  "distributionMode": "multi",
  "isPublic": true,
  "singleInviteCode": "shared-code-123",
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-12-31T23:59:59.999Z",
  "requireLinuxdo": true,
  "minTrustLevel": 1,
  "minRiskThreshold": 75
}
```

### 手动邀请模式
```json
{
  "name": "精选资源",
  "category": "资源分享",
  "totalQuota": 10,
  "distributionMode": "manual",
  "isPublic": false,
  "question1": "你的使用目的？",
  "question2": "相关经验？",
  "startTime": "2024-01-01T00:00:00.000Z",
  "requireLinuxdo": true,
  "minTrustLevel": 3,
  "minRiskThreshold": 85
}
```

## 响应格式

### 成功响应 (200)
```json
{
  "success": true,
  "message": "项目创建成功",
  "data": {
    "id": "project_id_123",
    "name": "项目名称",
    "description": "项目描述",
    "category": "项目分类",
    "distributionMode": "single",
    "totalQuota": 10,
    "isPublic": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "tag": {
      "id": "tag_id_123",
      "name": "标签名称"
    },
    "creator": {
      "id": "user_id_123",
      "name": "用户名",
      "email": "user@example.com"
    }
  }
}
```

### 错误响应

#### 数据验证失败 (400)
```json
{
  "error": "数据验证失败",
  "details": "项目名称不能为空"
}
```

#### 用户未认证 (401)
```json
{
  "error": "用户未登录或认证失败"
}
```

#### 项目名称冲突 (409)
```json
{
  "error": "项目名称已存在，请使用其他名称"
}
```

#### 服务器错误 (500)
```json
{
  "error": "服务器内部错误，请稍后重试"
}
```

## 数据库操作

API会执行以下数据库操作：

1. **标签处理**: 查找或创建项目标签
2. **密码加密**: 使用bcrypt加密领取密码
3. **项目创建**: 在`share_project`表中创建项目记录
4. **邀请码记录**: 一码一用模式下在`single_code_claim`表中创建邀请码记录

## 认证说明

API使用Better Auth进行用户认证：
- 通过Better Auth的session管理获取当前用户
- 自动检查用户是否被禁用
- 支持LinuxDo OAuth和邮箱密码登录
- Session有效期为7天，每天自动更新

### 认证流程
1. 用户通过Better Auth登录（LinuxDo OAuth或邮箱密码）
2. Better Auth创建session并设置cookie
3. API接口通过`auth.api.getSession()`验证用户身份
4. 检查用户状态（是否被禁用）
5. 返回用户ID用于创建项目

### 测试认证
在浏览器中先登录系统，然后调用API，或者使用包含有效session cookie的请求。

## 测试

### 方法1：浏览器测试
1. 在浏览器中登录系统
2. 打开开发者工具，在Console中运行：
```javascript
fetch('/api/projects/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "测试项目",
    category: "人工智能",
    totalQuota: 2,
    distributionMode: "single",
    isPublic: true,
    inviteCodes: ["code1", "code2"],
    startTime: new Date().toISOString(),
    requireLinuxdo: true,
    minTrustLevel: 2,
    minRiskThreshold: 80
  })
}).then(r => r.json()).then(console.log)
```

### 方法2：使用测试脚本
```bash
# 注意：需要先在浏览器中登录，然后复制session cookie
node test-api.js
```

### 方法3：使用curl（需要有效session）
```bash
# 先从浏览器开发者工具中复制完整的Cookie头
curl -X POST http://localhost:3000/api/projects/create \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=your_session_token_here" \
  -d @test-data.json
``` 