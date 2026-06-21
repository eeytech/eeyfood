export interface TokenCompany {
  id: string;
  name: string;
  slug: string;
}

export interface TokenPermission {
  module: string;
  actions: string[] | "FULL";
}

export interface EeyCoreTokenPayload {
  sub: string;
  name: string;
  email: string;
  appSlug: string;
  companyId: string;
  companySlug: string;
  companies: TokenCompany[];
  permissions: TokenPermission[];
  iat: number;
  exp: number;
}
