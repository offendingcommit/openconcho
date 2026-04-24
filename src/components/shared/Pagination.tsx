import { Button } from "@/components/ui/button";
import { MonoCaption } from "@/components/ui/typography";

interface PaginationProps {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
	if (totalPages <= 1) return null;

	return (
		<div className="flex items-center gap-2 mt-6">
			<Button
				variant="surface"
				size="sm"
				onClick={() => onPageChange(page - 1)}
				disabled={page <= 1}
			>
				Previous
			</Button>
			<MonoCaption className="px-2">{page} / {totalPages}</MonoCaption>
			<Button
				variant="surface"
				size="sm"
				onClick={() => onPageChange(page + 1)}
				disabled={page >= totalPages}
			>
				Next
			</Button>
		</div>
	);
}
