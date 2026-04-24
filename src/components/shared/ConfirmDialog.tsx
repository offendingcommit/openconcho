import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
} from "@/components/ui/dialog";
import { COLOR } from "@/lib/constants";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
	danger?: boolean;
	loading?: boolean;
}

export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Confirm",
	onConfirm,
	onCancel,
	danger = true,
	loading = false,
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
			<DialogContent className="max-w-sm">
				<div className="flex items-start gap-3 mb-4">
					{danger && (
						<div
							className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
							style={{ background: COLOR.destructiveDim }}
						>
							<AlertTriangle
								className="w-4 h-4"
								style={{ color: COLOR.destructive }}
								strokeWidth={2}
							/>
						</div>
					)}
					<div>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription className="mt-1">{description}</DialogDescription>
					</div>
				</div>
				<DialogFooter>
					<Button variant="surface" size="sm" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						variant={danger ? "destructive" : "accent"}
						size="sm"
						onClick={onConfirm}
						disabled={loading}
					>
						{loading ? "..." : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
