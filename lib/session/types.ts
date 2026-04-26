export type CustomerSessionIdentity = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingConsent?: boolean;
};

export type CustomerSessionResponse = {
  identity: CustomerSessionIdentity | null;
  expiresInSeconds: number;
};
