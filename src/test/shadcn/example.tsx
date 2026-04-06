import type { ComponentType, PropsWithChildren } from "react";

import * as icons from "lucide-react";

export function Example({ title, children }: PropsWithChildren<{ title?: string }>) {
  return (
    <div className="flex flex-col gap-2 p-2" data-testid="example">
      {title && <h1 className="text-2xl font-bold">{title}</h1>}
      {children}
    </div>
  );
}

export function IconPlaceholder({
  lucide,
  tabler: _tabler,
  hugeicons: _hugeicons,
  phosphor: _phosphor,
  remixicon: _remixicon,
  ...rest
}: {
  lucide?: keyof typeof icons;
  tabler?: string;
  hugeicons?: string;
  phosphor?: string;
  remixicon?: string;
}) {
  const Icon = lucide ? (icons[lucide] as ComponentType) : null;
  if (!Icon) {
    return null;
  }
  return <Icon {...rest} />;
}
