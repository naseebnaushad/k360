import type { ComponentProps } from "react";

const SIZES = {
  default: "max-w-6xl",
  wide: "max-w-[90rem]",
  narrow: "max-w-3xl",
} as const;

interface ContainerProps extends ComponentProps<"div"> {
  size?: keyof typeof SIZES;
}

export function Container({ className = "", size = "default", ...props }: ContainerProps) {
  return <div className={`mx-auto w-full px-4 sm:px-6 ${SIZES[size]} ${className}`} {...props} />;
}
