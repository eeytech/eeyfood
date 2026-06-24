export interface TokenCompany {
  id: string;
  name: string;
}

export interface EeyCoreTokenPayload {
  sub: string;
  email: string;
  name?: string;
  application: string;
  applicationId: string;
  modules: Record<string, string[]>;
  isApplicationAdmin: boolean;
  companyIds: string[];
  companies: TokenCompany[];
  activeCompanyId: string;
  iat: number;
  exp: number;
}
