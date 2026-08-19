export interface TokenCompany {
  id: string;
  name: string;
}

export interface EeyCoreTokenPayload {
  sub: string;
  email: string;
  name?: string;
  role?: string;
  application?: string;
  applicationId?: string;
  companyId?: string;
  companySlug?: string;
  activeCompanyId?: string;
  companyIds?: string[];
  companies?: TokenCompany[];
  modules?: Record<string, string[]>;
  isApplicationAdmin?: boolean;
  iat?: number;
  exp?: number;
}
