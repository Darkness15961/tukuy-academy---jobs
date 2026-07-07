type EnvConfig = {
  apiUrl: string
  useMock: boolean
  isProduction: boolean
}

function readEnv(): EnvConfig {
  const isProduction = import.meta.env.PROD
  const apiUrl = import.meta.env.VITE_API_URL?.trim() || '/api'
  const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

  if (isProduction) {
    if (useMock) {
      throw new Error(
        '[Tukuy Academy] VITE_USE_MOCK debe ser "false" en producción. Configura las variables en tu plataforma de deploy.',
      )
    }

    if (!import.meta.env.VITE_API_URL?.trim()) {
      throw new Error(
        '[Tukuy Academy] VITE_API_URL es obligatorio en producción. Ejemplo: https://api.tudominio.com',
      )
    }

    if (apiUrl.startsWith('/')) {
      console.warn(
        '[Tukuy Academy] VITE_API_URL usa una ruta relativa. En producción conviene una URL absoluta del backend.',
      )
    }
  }

  return { apiUrl, useMock, isProduction }
}

export const env = readEnv()
