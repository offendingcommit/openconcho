import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
	<input
		ref={ref}
		className={cn(
			"flex w-full rounded-lg px-3 py-2 text-sm transition-all outline-none",
			"[background:var(--surface)] [color:var(--text-1)]",
			"[border:1px_solid_var(--border-2)]",
			"placeholder:[color:var(--text-4)]",
			"focus:[border-color:var(--accent)]",
			"disabled:opacity-50 disabled:cursor-not-allowed",
			className,
		)}
		{...props}
	/>
));
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, ...props }, ref) => (
		<textarea
			ref={ref}
			className={cn(
				"flex w-full rounded-lg px-3 py-2 text-sm transition-all outline-none resize-none",
				"[background:var(--surface)] [color:var(--text-1)]",
				"[border:1px_solid_var(--border-2)]",
				"placeholder:[color:var(--text-4)]",
				"focus:[border-color:var(--accent)]",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				className,
			)}
			{...props}
		/>
	),
);
Textarea.displayName = "Textarea";
