'use client';

import { getVersionString } from '../../lib/version';

export default function VersionBadge() {
  const version = getVersionString();

  return (
    <span
      className="select-all text-xs text-gray-400"
      title={version}
    >
      {version}
    </span>
  );
}
