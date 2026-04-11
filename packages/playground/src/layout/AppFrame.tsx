import type { ReactNode } from "react";
import type { Route } from "../lib/routes";

type AppFrameProps = {
	route: Route;
	children: ReactNode;
};

const linkClass = (active: boolean) =>
	[
		"rounded-full border px-4 py-2 text-sm font-medium transition",
		active
			? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
			: "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-slate-100",
	].join(" ");

export function AppFrame({ route, children }: AppFrameProps) {
	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_30%),linear-gradient(180deg,_#0f172a,_#020617_65%)] text-slate-50">
			<div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
				<header className="flex flex-wrap items-end justify-between gap-5">
					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">OOFP Playground</p>
						<div>
							<h1 className="text-4xl font-semibold tracking-tight text-white">React workbench</h1>
							<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
								Dos superficies separadas para iterar la API actual y experimentar sobre estado rico.
							</p>
						</div>
					</div>
					<nav className="flex flex-wrap gap-3">
						<a href="#current" className={linkClass(route === "current")}>
							Current API
						</a>
						<a href="#state-lab" className={linkClass(route === "state-lab")}>
							State Lab
						</a>
					</nav>
				</header>
				<main>{children}</main>
			</div>
		</div>
	);
}
