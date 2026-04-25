interface ErrorAlertProps {
	error: Error | null;
	message?: string;
}

export function ErrorAlert({ error, message }: ErrorAlertProps) {
	if (!error) return null;
	return (
		<div
			className="rounded-xl p-4 mb-4"
			style={{
				background: "rgba(239, 68, 68, 0.08)",
				border: "1px solid rgba(239, 68, 68, 0.25)",
			}}
		>
			<p className="text-sm font-medium" style={{ color: "#f87171" }}>
				{message ?? "An error occurred"}
			</p>
			<p className="text-xs mt-1 font-mono" style={{ color: "rgba(248, 113, 113, 0.6)" }}>
				{error.message}
			</p>
		</div>
	);
}
