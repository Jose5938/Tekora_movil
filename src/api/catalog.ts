import { isRecord, type Category } from './types';

export function catalogPath(path: '/providers' | '/services', page: number, search = '', category = ''): string {
  const query = new URLSearchParams({ page: String(page) });
  const text = search.trim();
  if (text) query.set('q', text);
  if (path === '/services' && category) query.set('category', category);
  return `${path}?${query}`;
}

export function isCategories(value: unknown): value is { data: Category[] } {
  return isRecord(value) && Array.isArray(value.data) && value.data.every(item =>
    isRecord(item) && typeof item.id === 'number' && Number.isSafeInteger(item.id) && item.id > 0 &&
    typeof item.name === 'string' && typeof item.slug === 'string' && item.slug.length > 0);
}
