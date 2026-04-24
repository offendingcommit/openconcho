import { cn } from "@/lib/utils";

type AsChild<T extends React.ElementType> = {
	as?: T;
	className?: string;
	children?: React.ReactNode;
};

type Props<T extends React.ElementType> = AsChild<T> &
	Omit<React.ComponentPropsWithoutRef<T>, keyof AsChild<T>>;

export function PageTitle<T extends React.ElementType = "h1">({
	as,
	className,
	children,
	...rest
}: Props<T>) {
	const Tag = (as ?? "h1") as React.ElementType;
	return (
		<Tag
			className={cn("text-xl font-semibold tracking-tight", className)}
			style={{ color: "var(--text-1)" }}
			{...rest}
		>
			{children}
		</Tag>
	);
}

export function SectionHeading<T extends React.ElementType = "h2">({
	as,
	className,
	children,
	...rest
}: Props<T>) {
	const Tag = (as ?? "h2") as React.ElementType;
	return (
		<Tag
			className={cn("text-sm font-medium mb-3", className)}
			style={{ color: "var(--text-1)" }}
			{...rest}
		>
			{children}
		</Tag>
	);
}

export function Body<T extends React.ElementType = "p">({
	as,
	className,
	children,
	...rest
}: Props<T>) {
	const Tag = (as ?? "p") as React.ElementType;
	return (
		<Tag
			className={cn("text-sm leading-relaxed", className)}
			style={{ color: "var(--text-2)" }}
			{...rest}
		>
			{children}
		</Tag>
	);
}

export function Muted<T extends React.ElementType = "p">({
	as,
	className,
	children,
	...rest
}: Props<T>) {
	const Tag = (as ?? "p") as React.ElementType;
	return (
		<Tag className={cn("text-sm", className)} style={{ color: "var(--text-3)" }} {...rest}>
			{children}
		</Tag>
	);
}

export function Caption<T extends React.ElementType = "span">({
	as,
	className,
	children,
	...rest
}: Props<T>) {
	const Tag = (as ?? "span") as React.ElementType;
	return (
		<Tag className={cn("text-xs", className)} style={{ color: "var(--text-4)" }} {...rest}>
			{children}
		</Tag>
	);
}

export function MonoCaption<T extends React.ElementType = "span">({
	as,
	className,
	children,
	...rest
}: Props<T>) {
	const Tag = (as ?? "span") as React.ElementType;
	return (
		<Tag
			className={cn("text-xs font-mono", className)}
			style={{ color: "var(--text-4)" }}
			{...rest}
		>
			{children}
		</Tag>
	);
}
