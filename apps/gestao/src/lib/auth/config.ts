export const authConfig = {
  eeycore: {
    get baseUrl() {
      return process.env.EECORE_BASE_URL ?? "";
    },
    get appSlug() {
      return process.env.EECORE_APP_SLUG ?? "";
    },
    get apiKey() {
      return process.env.EECORE_API_KEY ?? "";
    },
    get jwtSecret() {
      const secret = process.env.EECORE_JWT_SECRET;
      if (!secret) {
        throw new Error(
          "[SECURITY] EECORE_JWT_SECRET não está configurado. Configure a variável de ambiente antes de iniciar a aplicação.",
        );
      }
      return secret;
    },
  },
  cookie: {
    name: "eey_session",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  },
} as const;
