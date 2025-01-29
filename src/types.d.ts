declare namespace HelpScoutClient {

  type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

  interface ApiCredentials {
    clientId: string
    clientSecret: string
  }

  interface ClientOptions {
    baseUrl: string
    rateLimit: number
  }

  interface OptionsParams {
    baseUrl?: string
    rateLimit?: number
  }

  interface ApiAuthTokenResponse {
    refresh_token: string
    token_type: string
    access_token: string
    expires_in: number
  }

  interface ApiAuthTokens {
    accessToken: string
    refreshToken: string
    expiresAt: number
  }

  interface AccessToken {
    expiresAt: number
  }

  type SuccessCallback<T> = (result: T) => void

}
