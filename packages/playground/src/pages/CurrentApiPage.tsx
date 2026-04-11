import { Render, component, context, iaction, props } from "@oofp/react";
import { PageShell } from "../components/PageShell";
import { Surface } from "../components/Surface";
import { appContext, type AppContext } from "../lib/app-context";

type CounterProps = {
	label: string;
};

type CounterState = {
	count: number;
};

const increment = iaction<void, CounterState>(() => (draft: CounterState) => {
	draft.count += 1;
});

const decrement = iaction<void, CounterState>(() => (draft: CounterState) => {
	draft.count -= 1;
});

const reset = iaction<void, CounterState>(() => (draft: CounterState) => {
	draft.count = 0;
});

const counterActions = { increment, decrement, reset };

const greeting = component({
	type: "stateless",
	ctx: context<AppContext>(),
	props: props<{ name: string }>(),
	render: ({ ctx, props }) => (
		<p className="text-sm leading-6 text-slate-300">
			Welcome to <strong className={ctx.accentClass}>{ctx.appName}</strong>, {props.name}.
		</p>
	),
});

const counter = component({
	type: "stateful",
	ctx: context<AppContext>(),
	props: props<CounterProps>(),
	initialState: { count: 0 } satisfies CounterState,
	actions: counterActions,
	render: ({ ctx, props, state, mut: [dispatch, actions] }) => (
		<div className="grid gap-5 rounded-3xl border border-slate-700/60 bg-slate-900/75 p-6 shadow-lg shadow-slate-950/20">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h3 className="text-lg font-semibold text-slate-50">{props.label}</h3>
					<p className="mt-1 text-sm text-slate-400">Shared API, isolated state.</p>
				</div>
				<span className={`rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-medium uppercase tracking-wide ${ctx.accentClass}`}>
					count
				</span>
			</div>
			<p className="text-6xl font-semibold tracking-tight text-white">{state.count}</p>
			<div className="flex flex-wrap gap-3">
				<button
					type="button"
					className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700"
					onClick={() => dispatch(actions.decrement())}
				>
					-1
				</button>
				<button
					type="button"
					className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700"
					onClick={() => dispatch(actions.reset())}
				>
					Reset
				</button>
				<button
					type="button"
					className="rounded-full border border-cyan-400/50 bg-cyan-400/90 px-4 py-2 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-300"
					onClick={() => dispatch(actions.increment())}
				>
					+1
				</button>
			</div>
		</div>
	),
});

export function CurrentApiPage() {
	return (
		<PageShell
			eyebrow="Current API"
			title="Surface small and stable"
			description={
				<>
					<p>This page stays intentionally narrow. It is the clean reference for `component`, `Render` and `iaction`.</p>
					<Render component={greeting} context={appContext} props={{ name: "developer" }} />
				</>
			}
		>
			<div className="grid gap-4 lg:grid-cols-2">
				<Render component={counter} context={appContext} props={{ label: "Counter A" }} />
				<Render component={counter} context={appContext} props={{ label: "Counter B" }} />
			</div>
			<div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
				<Surface
					title="What this page is for"
					subtitle="Baseline for regressions while you evolve @oofp/react"
				>
					<ul className="grid gap-2 text-sm leading-6 text-slate-300">
						<li>Check render behavior stays predictable.</li>
						<li>Validate stateful components still isolate their own state.</li>
						<li>Keep one tiny example that is easy to read while refactoring internals.</li>
					</ul>
				</Surface>
				<Surface title="Next obvious extensions" subtitle="Good additions without polluting the reference page">
					<ul className="grid gap-2 text-sm leading-6 text-slate-300">
						<li>Controlled inputs with actions.</li>
						<li>Parent/child composition examples.</li>
						<li>Async or effectful patterns when those APIs land.</li>
					</ul>
				</Surface>
			</div>
		</PageShell>
	);
}
