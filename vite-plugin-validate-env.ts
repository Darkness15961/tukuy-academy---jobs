import type { Plugin } from 'vite'

export function validateProductionEnv(): Plugin {
  return {
    name: 'validate-production-env',
    configResolved(config) {
      if (!config.isProduction) return

      const useMock = config.env.VITE_USE_MOCK
      const apiUrl = config.env.VITE_API_URL?.trim()

      if (useMock !== 'false') {
        throw new Error(
          '[build] VITE_USE_MOCK debe ser "false" en producción. Configura las variables antes de desplegar.',
        )
      }

      if (!apiUrl) {
        throw new Error(
          '[build] VITE_API_URL es obligatorio en producción. Ejemplo: https://api.tudominio.com',
        )
      }
    },
  }
}
