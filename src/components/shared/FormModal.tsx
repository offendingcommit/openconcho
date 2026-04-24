import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FormModalProps {
	open: boolean;
	title: string;
	onClose: () => void;
	children: React.ReactNode;
	maxWidth?: string;
}

export function FormModal({
	open,
	title,
	onClose,
	children,
	maxWidth = "max-w-md",
}: FormModalProps) {
	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className={cn("p-0", maxWidth)}>
				<DialogHeader className="px-5 py-4 mb-0">
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="px-5 pb-5">{children}</div>
			</DialogContent>
		</Dialog>
	);
}
