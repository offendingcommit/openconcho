import { cn } from "@/lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import { forwardRef } from "react";

export const Label = forwardRef<
	React.ComponentRef<typeof LabelPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
	<LabelPrimitive.Root
		ref={ref}
		className={cn(
			"block text-xs font-medium leading-none",
			"peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
			className,
		)}
		style={{ color: "var(--text-2)" }}
		{...props}
	/>
));
Label.displayName = LabelPrimitive.Root.displayName;
