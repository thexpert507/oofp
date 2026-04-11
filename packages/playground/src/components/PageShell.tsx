import type { PropsWithChildren, ReactNode } from "react";

type PageShellProps = PropsWithChildren<{
	eyebrow: string;
	title: string;
	description: ReactNode;
	actions?: ReactNode;
}>;

export function PageShell({ eyebrow, title, description, actions, children }: PageShellProps) {
	return (
		<div className="grid gap-6">
			<section className="grid gap-4 rounded-3xl border border-cyan-400/20 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="max-w-3xl space-y-3">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
						<h2 className="text-3xl font-semibold tracking-tight text-slate-50">{title}</h2>
						<div className="text-sm leading-6 text-slate-300">{description}</div>
					</div>
					{actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
				</div>
			</section>
			<div className="grid gap-4">{children}</div>
		</div>
	);
}
