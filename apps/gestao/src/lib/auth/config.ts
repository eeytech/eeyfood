export const authConfig = {
  eeycore: {
    get baseUrl() {
      return process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "";
    },
    get appSlug() {
      return process.env.NEXT_PUBLIC_APP_SLUG ?? "";
    },
    get jwtSecret() {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error(
          "[SECURITY] JWT_SECRET não está configurado. Configure a variável de ambiente antes de iniciar a aplicação.",
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
