import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type CenteredLoaderProps = {
  label?: string;
  className?: string;
};

export default function CenteredLoader({
  label = "Loading...",
  className,
}: CenteredLoaderProps) {
  return (
    <div
      className={cn(
        "w-full min-h-[60vh] grid place-items-center px-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/80 bg-white/70 px-8 py-7 shadow-xl backdrop-blur-xl">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-primary-200/70" />
          <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-primary-600" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-700">
          {label}
        </p>
      </div>
    </div>
  );
}
