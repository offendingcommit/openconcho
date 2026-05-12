import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	[
		"inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
		"disabled:opacity-50 disabled:pointer-events-none",
	],
	{
		variants: {
			variant: {
				primary: ["text-white", "[background:var(--accent)]", "focus-visible:ring-[var(--accent)]"],
				accent: [
					"[background:var(--accent-dim)] [color:var(--accent-text)]",
					"[border:1px_solid_var(--accent-border)]",
					"focus-visible:ring-[var(--accent)]",
				],
				surface: [
					"[background:var(--surface)] [color:var(--text-2)]",
					"[border:1px_solid_var(--border)]",
					"focus-visible:ring-[var(--border)]",
				],
				ghost: [
					"[color:var(--text-2)]",
					"hover:[background:var(--surface)]",
					"focus-visible:ring-[var(--border)]",
				],
				destructive: [
					"bg-[rgba(239,68,68,0.08)] text-[#f87171]",
					"border border-[rgba(239,68,68,0.2)]",
					"focus-visible:ring-[#f87171]",
				],
			},
			size: {
				default: "px-4 py-2 text-sm",
				sm: "px-3 py-1.5 text-xs",
				icon: "p-1.5 text-sm",
			},
		},
		defaultVariants: {
			variant: "accent",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
		);
	},
);
Button.displayName = "Button";

export { buttonVariants };
