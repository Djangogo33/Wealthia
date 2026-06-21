import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";

interface DynamicIconProps extends LucideProps {
  name: string;
  fallback?: string;
}

function toPascalCase(str: string) {
  return str
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function DynamicIcon({ name, fallback = "circle", ...props }: DynamicIconProps) {
  const lib = LucideIcons as unknown as Record<string, ComponentType<LucideProps>>;
  const Icon = lib[toPascalCase(name)] ?? lib[toPascalCase(fallback)] ?? LucideIcons.Circle;
  return <Icon {...props} />;
}
