// src/components/ui/background-gradient.tsx
import { cn } from "@/lib/utils";

interface BackgroundGradientProps {
  from: string;
  to: string;
  shape: string;
  className?: string;
}

export function BackgroundGradient({ from, to, shape, className }: BackgroundGradientProps) {
  return (
    <div
      className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      aria-hidden="true"
    >
      <div
        className={cn(
            "relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]",
            from,
            to,
            className
        )}
        style={{
          clipPath: shape,
        }}
      />
    </div>
  );
}
