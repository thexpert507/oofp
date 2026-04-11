export type Route = "current" | "state-lab";

export const getRoute = (): Route => {
	if (typeof window === "undefined") return "current";
	return window.location.hash === "#state-lab" ? "state-lab" : "current";
};

export const ensureRoute = () => {
	if (typeof window === "undefined") return;
	if (!window.location.hash) window.location.hash = "#current";
};
