import type { PropsWithChildren, ReactNode } from "react";

type SurfaceProps = PropsWithChildren<{
	title?: string;
	subtitle?: ReactNode;
	actions?: ReactNode;
	className?: string;
}>;

export function Surface({ title, subtitle, actions, className = "", children }: SurfaceProps) {
	return (
		<section
			className={`grid gap-4 rounded-3xl border border-slate-700/60 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/20 ${className}`}
		>
			{title || actions ? (
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						{title ? <h3 className="text-base font-semibold text-slate-100">{title}</h3> : null}
						{subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
					</div>
					{actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
				</div>
			) : null}
			{children}
		</section>
	);
}
