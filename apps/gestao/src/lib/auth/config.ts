export const authConfig = {
  eeycore: {
    get jwtSecret() {
      const secret = process.env.JWT_SECRET ?? "eeyfood_default_jwt_secret_key_2026";
      return secret;
    },
  },
  cookie: {
    name: "eey_session",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  },
} as const;

