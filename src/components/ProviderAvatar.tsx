import { ProviderIcon, Poe } from '@lobehub/icons';

interface ProviderAvatarProps {
  iconKey: string;
  size?: number;
}

export function ProviderAvatar({ iconKey, size = 24 }: ProviderAvatarProps) {
  if (iconKey === 'poe') {
    return <Poe.Avatar size={size} />;
  }
  if (iconKey === 'custom') {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700"
        style={{ width: size, height: size }}
      >
        <svg
          className="w-3/5 h-3/5 text-gray-500 dark:text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
    );
  }
  return <ProviderIcon provider={iconKey} size={size} type="avatar" />;
}
