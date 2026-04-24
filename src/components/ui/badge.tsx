import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const badgeVariants = cva(
	"inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary/15 text-primary",
				secondary: "border-transparent bg-secondary text-muted-foreground",
				outline: "border-border text-muted-foreground",
				destructive: "border-transparent bg-red-500/15 text-red-400",
				success: "border-transparent bg-emerald-500/15 text-emerald-400",
				warning: "border-transparent bg-amber-500/15 text-amber-400",
				blue: "border-transparent bg-sky-500/15 text-sky-400",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
	return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
