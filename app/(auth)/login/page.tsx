import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams;
  
  const errorMessages: Record<string, string> = {
    oauth_error: "OAuth授权失败，请重试",
    invalid_state: "认证状态无效，请重新尝试登录",
    no_code: "未收到授权码，请重新尝试登录",
    token_error: "获取访问令牌失败",
    user_info_error: "获取用户信息失败",
    server_error: "服务器处理错误，请稍后再试",
    account_disabled: "账户已被禁用，请联系管理员",
    email_conflict: "该邮箱已被其他账户使用，请使用邮箱密码登录或联系管理员",
    username_conflict: "该用户名已被使用，请联系管理员",
  }

  const errorMessage = params.error ? errorMessages[params.error] || "登录过程中发生错误" : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm initialError={errorMessage} />
    </div>
  )
}
