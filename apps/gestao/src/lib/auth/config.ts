const getRawJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[SECURITY CRITICAL] A variável JWT_SECRET não está definida em ambiente de produção! Configure um segredo forte em suas variáveis de ambiente.",
      );
    }
    return "eeyfood_default_jwt_secret_key_2026";
  }
  return secret;
};

export const getJwtSecretKey = (): Uint8Array => {
  return new TextEncoder().encode(getRawJwtSecret());
};

export const authConfig = {
  eeycore: {
    get jwtSecret() {
      return getRawJwtSecret();
    },
  },
  cookie: {
    name: "eey_session",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  },
} as const;
