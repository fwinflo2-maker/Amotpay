import * as SecureStore from 'expo-secure-store';
import type { Person } from './people';
import { personId } from './people';

const KEY = 'amotpay_send_people';
const MAX = 40;

export async function loadPeople(): Promise<Person[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Person[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePeople(people: Person[]): Promise<void> {
  const trimmed = people
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX);
  await SecureStore.setItemAsync(KEY, JSON.stringify(trimmed));
}

export async function upsertPerson(input: Omit<Person, 'id' | 'lastUsedAt' | 'favorite'> & { favorite?: boolean }): Promise<Person> {
  const people = await loadPeople();
  const id = personId(input.phone, input.firstName, input.lastName);
  const existing = people.find((p) => p.id === id);
  const next: Person = {
    id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    phone: input.phone.trim(),
    countryCode: input.countryCode,
    favorite: input.favorite ?? existing?.favorite ?? false,
    lastUsedAt: Date.now(),
  };
  const without = people.filter((p) => p.id !== id);
  await savePeople([next, ...without]);
  return next;
}

export async function toggleFavorite(id: string): Promise<void> {
  const people = await loadPeople();
  const updated = people.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p));
  await savePeople(updated);
}

export function filterPeople(people: Person[], query: string): Person[] {
  const q = query.trim().toLowerCase();
  if (!q) return people;
  return people.filter(
    (p) =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.phone.includes(q),
  );
}
