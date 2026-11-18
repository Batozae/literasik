"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";

function Switch({
  className,
  size = "default",
  checked,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  const isSm = size === "sm";
  const isControlled = typeof checked === "boolean";

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      checked={checked}
      className={cn(
        "peer relative inline-flex shrink-0 cursor-pointer items-center overflow-hidden rounded-full border-0 p-1 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isSm ? "h-5 w-9" : "h-6 w-11",
        isControlled
          ? checked
            ? "bg-emerald-500 hover:bg-emerald-600"
            : "bg-slate-300 hover:bg-slate-400"
          : "bg-slate-300 hover:bg-slate-400 data-checked:bg-emerald-500 hover:data-checked:bg-emerald-600",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm transition-transform duration-200",
          isSm ? "size-4" : "size-5",
          isControlled
            ? checked
              ? isSm
                ? "translate-x-4"
                : "translate-x-5"
              : "translate-x-0"
            : isSm
              ? "translate-x-0 data-checked:translate-x-4"
              : "translate-x-0 data-checked:translate-x-5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
