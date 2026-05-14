import { cn } from "@/lib/utils";

export function LogoMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg font-extrabold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: "#00B8D9",
        fontSize: size * 0.42,
        letterSpacing: "-0.04em",
      }}
      aria-label="HireLoop"
    >
      HL
    </div>
  );
}
