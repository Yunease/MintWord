let avatarUrl = '';
const listeners = new Set<() => void>();

export function setAvatarUrl(url: string) {
  avatarUrl = url;
  listeners.forEach((fn) => fn());
}

export function getAvatarUrl(): string {
  return avatarUrl;
}

export function subscribeAvatar(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
