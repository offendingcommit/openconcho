import { useState, useEffect } from "react";
import { type Theme, getStoredTheme, applyTheme } from "@/lib/theme";

export function useTheme() {
	const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	function toggle() {
		setTheme((t) => (t === "dark" ? "light" : "dark"));
	}

	return { theme, toggle };
}
