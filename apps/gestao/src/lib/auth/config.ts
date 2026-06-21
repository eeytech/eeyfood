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
      return process.env.EECORE_JWT_SECRET ?? "";
    },
  },
  cookie: {
    name: "eey_session",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  },
} as const;
