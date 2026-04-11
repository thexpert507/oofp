import { Render, component, context, props } from "@oofp/react";
import { PageShell } from "../../components/PageShell";
import { Surface } from "../../components/Surface";
import { appContext, type AppContext } from "../../lib/app-context";
import { BacklogItem, LabState, initialState } from "./state";
// To compare implementations, swap the import below:
import { actions } from "./actions"; // functional: action() + Focal optics
// import { actions } from "./actions-imperative"; // imperative: iaction() + Immer draft

const stateLab = component({
	type: "stateful",
	ctx: context<AppContext>(),
	props: props<{ title: string }>(),
	initialState,
	actions,
	render: ({ props, state, mut: [dispatch, actions] }) => {
		const filteredItems = state.backlog.filter((item) => {
			const matchesQuery = item.title.toLowerCase().includes(state.filters.query.toLowerCase());
			const matchesKind = state.filters.kind === "all" || item.kind === state.filters.kind;
			const matchesPinned = !state.filters.showPinnedOnly || item.pinned;
			return matchesQuery && matchesKind && matchesPinned;
		});

		const selectedItem = state.backlog.find((item) => item.id === state.ui.selectedId) ?? null;
		const totalPoints = state.backlog.reduce((sum, item) => sum + item.estimate, 0);
		const doneItems = state.backlog.filter((item) => item.status === "done").length;
		const pinnedCount = state.backlog.filter((item) => item.pinned).length;

		return (
			<PageShell
				eyebrow="State Lab"
				title={props.title}
				description={
					<>
						<p>
							Miniapp pensada para probar hooks de `packages/react/lib/state` sobre estado anidado,
							colecciones, derivaciones, seleccion, formularios y toggles.
						</p>
					</>
				}
				actions={
					<>
						<div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
							<span className="block text-xs uppercase tracking-[0.16em] text-slate-500">
								Items
							</span>
							<strong className="text-xl text-white">{state.backlog.length}</strong>
						</div>
						<div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
							<span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Done</span>
							<strong className="text-xl text-white">{doneItems}</strong>
						</div>
						<div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
							<span className="block text-xs uppercase tracking-[0.16em] text-slate-500">
								Points
							</span>
							<strong className="text-xl text-white">{totalPoints}</strong>
						</div>
					</>
				}
			>
				<div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
					<div className="grid gap-4">
						<Surface title="Filters" subtitle="Compose selectors and UI state over the same store">
							<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
								<input
									className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
									value={state.filters.query}
									onChange={(event) => dispatch(actions.setQuery(event.target.value))}
									placeholder="Search backlog"
								/>
								<select
									className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
									value={state.filters.kind}
									onChange={(event) =>
										dispatch(
											actions.setKindFilter(event.target.value as LabState["filters"]["kind"]),
										)
									}
								>
									<option value="all">All kinds</option>
									<option value="feature">Feature</option>
									<option value="bug">Bug</option>
									<option value="spike">Spike</option>
								</select>
								<label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
									<input
										type="checkbox"
										checked={state.filters.showPinnedOnly}
										onChange={() => dispatch(actions.togglePinnedOnly())}
										className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400"
									/>
									Pinned only
								</label>
								<label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
									<input
										type="checkbox"
										checked={state.ui.compact}
										onChange={() => dispatch(actions.toggleCompact())}
										className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400"
									/>
									Compact
								</label>
								<div className="flex gap-2">
									<button
										type="button"
										className={
											state.ui.preview === "board" ? activeToggleClass : inactiveToggleClass
										}
										onClick={() => dispatch(actions.setPreview("board"))}
									>
										Board
									</button>
									<button
										type="button"
										className={
											state.ui.preview === "stats" ? activeToggleClass : inactiveToggleClass
										}
										onClick={() => dispatch(actions.setPreview("stats"))}
									>
										Stats
									</button>
								</div>
							</div>
						</Surface>

						<Surface
							title="Composer"
							subtitle="Controlled inputs, draft state and collection updates"
							actions={
								<button
									type="button"
									className={primaryButtonClass}
									onClick={() => dispatch(actions.addDraft())}
								>
									Add item
								</button>
							}
						>
							<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
								<input
									className={fieldClass}
									placeholder="New item title"
									value={state.draft.title}
									onChange={(event) => dispatch(actions.setDraftTitle(event.target.value))}
								/>
								<select
									className={fieldClass}
									value={state.draft.kind}
									onChange={(event) =>
										dispatch(actions.setDraftKind(event.target.value as BacklogItem["kind"]))
									}
								>
									<option value="feature">Feature</option>
									<option value="bug">Bug</option>
									<option value="spike">Spike</option>
								</select>
								<input
									className={fieldClass}
									type="number"
									min={1}
									max={13}
									value={state.draft.estimate}
									onChange={(event) =>
										dispatch(actions.setDraftEstimate(Number(event.target.value) || 1))
									}
								/>
								<input
									className={fieldClass}
									placeholder="tags, comma separated"
									value={state.draft.tags}
									onChange={(event) => dispatch(actions.setDraftTags(event.target.value))}
								/>
							</div>
						</Surface>

						<Surface
							title="Backlog"
							subtitle="Lists, selection and item-level updates"
							actions={
								<button
									type="button"
									className={ghostButtonClass}
									onClick={() => dispatch(actions.clearDone())}
								>
									Clear done
								</button>
							}
						>
							<div className={`grid ${state.ui.compact ? "gap-2" : "gap-3"}`}>
								{filteredItems.map((item) => {
									const selected = item.id === state.ui.selectedId;
									return (
										<article
											key={item.id}
											className={[
												"grid gap-4 rounded-3xl border p-4 transition lg:grid-cols-[minmax(0,1fr)_auto]",
												selected
													? "border-cyan-400/60 bg-cyan-400/5"
													: "border-slate-700/60 bg-slate-950/40",
											].join(" ")}
										>
											<div className="grid gap-3">
												<div className="flex flex-wrap items-center justify-between gap-3">
													<strong className="text-base text-white">{item.title}</strong>
													<div className="flex flex-wrap gap-2 text-xs">
														<span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">
															{item.kind}
														</span>
														<span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">
															{item.status}
														</span>
														<span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">
															{item.estimate} pts
														</span>
													</div>
												</div>
												<div className="flex flex-wrap gap-2 text-xs text-cyan-200">
													{item.tags.map((tag) => (
														<span
															key={`${item.id}-${tag}`}
															className="rounded-full bg-cyan-400/10 px-3 py-1"
														>
															#{tag}
														</span>
													))}
												</div>
											</div>
											<div className="flex flex-wrap gap-2 lg:w-48 lg:justify-end">
												<button
													type="button"
													className={ghostButtonClass}
													onClick={() => dispatch(actions.selectItem(item.id))}
												>
													Open
												</button>
												<button
													type="button"
													className={ghostButtonClass}
													onClick={() => dispatch(actions.cycleStatus(item.id))}
												>
													Next status
												</button>
												<button
													type="button"
													className={ghostButtonClass}
													onClick={() => dispatch(actions.togglePinned(item.id))}
												>
													{item.pinned ? "Unpin" : "Pin"}
												</button>
											</div>
										</article>
									);
								})}
								{filteredItems.length === 0 ? (
									<p className="text-sm text-slate-400">No items match the current filters.</p>
								) : null}
							</div>
						</Surface>
					</div>

					<div className="grid gap-4">
						<Surface
							title="Selection"
							subtitle="Good target for selectors and focused update helpers"
						>
							{selectedItem ? (
								<div className="grid gap-4">
									<div className="space-y-2">
										<strong className="text-xl text-white">{selectedItem.title}</strong>
										<div className="flex flex-wrap gap-2 text-xs text-slate-300">
											<span className="rounded-full border border-slate-700 px-3 py-1">
												{selectedItem.kind}
											</span>
											<span className="rounded-full border border-slate-700 px-3 py-1">
												{selectedItem.status}
											</span>
											<span className="rounded-full border border-slate-700 px-3 py-1">
												{selectedItem.estimate} pts
											</span>
										</div>
									</div>
									<p className="text-sm leading-6 text-slate-300">
										Este panel es util para probar APIs que lean un item, actualicen un campo
										puntual, naveguen colecciones o compongan lentes/prisms/traversals.
									</p>
								</div>
							) : (
								<p className="text-sm text-slate-400">Select an item from the backlog.</p>
							)}
						</Surface>

						<Surface
							title={state.ui.preview === "board" ? "Board preview" : "Stats preview"}
							subtitle="Derived views over the same state"
						>
							{state.ui.preview === "board" ? (
								<div className="grid gap-3">
									{(["todo", "doing", "done"] as const).map((status) => (
										<div
											key={status}
											className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-4"
										>
											<div className="flex items-center justify-between gap-3">
												<strong className="capitalize text-slate-100">{status}</strong>
												<span className="text-sm text-slate-400">
													{state.backlog.filter((item) => item.status === status).length} items
												</span>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="grid gap-3 sm:grid-cols-3">
									<div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-4 text-sm text-slate-300">
										<span className="block text-xs uppercase tracking-[0.16em] text-slate-500">
											Pinned
										</span>
										<strong className="text-2xl text-white">{pinnedCount}</strong>
									</div>
									<div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-4 text-sm text-slate-300">
										<span className="block text-xs uppercase tracking-[0.16em] text-slate-500">
											Filtered
										</span>
										<strong className="text-2xl text-white">{filteredItems.length}</strong>
									</div>
									<div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-4 text-sm text-slate-300">
										<span className="block text-xs uppercase tracking-[0.16em] text-slate-500">
											Activity
										</span>
										<strong className="text-2xl text-white">{state.activity.length}</strong>
									</div>
								</div>
							)}
						</Surface>

						<Surface title="Activity" subtitle="Useful to observe dispatch effects over time">
							<div className="grid gap-2">
								{state.activity.slice(0, 8).map((entry, index) => (
									<div
										key={`${entry}-${index}`}
										className="rounded-2xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-sm text-slate-300"
									>
										{entry}
									</div>
								))}
							</div>
						</Surface>
					</div>
				</div>
			</PageShell>
		);
	},
});

export function StateLabPage() {
	return (
		<Render
			component={stateLab}
			context={appContext}
			props={{ title: "Backlog and workflow lab" }}
		/>
	);
}

const fieldClass =
	"rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500";

const primaryButtonClass =
	"rounded-full border border-cyan-400/50 bg-cyan-400/90 px-4 py-2 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-300";

const ghostButtonClass =
	"rounded-full border border-slate-600 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800";

const activeToggleClass =
	"rounded-full border border-cyan-400/60 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition";

const inactiveToggleClass =
	"rounded-full border border-slate-600 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";
