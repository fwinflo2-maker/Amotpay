export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  countryCode?: string;
  favorite: boolean;
  lastUsedAt: number;
};

export type RecipientMode = 'recent' | 'favorites' | 'search' | 'phone' | 'new';

export function personLabel(p: Person): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function personId(phone: string, firstName: string, lastName: string): string {
  return `${phone.trim().toLowerCase()}|${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
}
