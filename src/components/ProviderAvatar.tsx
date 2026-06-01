import { ProviderIcon, Poe } from '@lobehub/icons';

interface ProviderAvatarProps {
  iconKey: string;
  size?: number;
}

export function ProviderAvatar({ iconKey, size = 24 }: ProviderAvatarProps) {
  if (iconKey === 'poe') {
    return <Poe.Avatar size={size} />;
  }
  return <ProviderIcon provider={iconKey} size={size} type="avatar" />;
}
