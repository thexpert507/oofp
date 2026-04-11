import { action } from "@oofp/react";
import { BacklogItem, BacklogItemKind, BacklogItemStatus, LabState, UIPreview } from "./state";
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";
import { Focal } from "@oofp/focal";
import { flow } from "@oofp/core/flow";
import { Fn } from "@oofp/core/function";

// Focals
const Filters = pipe(Focal.from<LabState>(), Focal.prop("filters"));
const UI = pipe(Focal.from<LabState>(), Focal.prop("ui"));
const Backlog = pipe(Focal.from<LabState>(), Focal.prop("backlog"));
const Activity = pipe(Focal.from<LabState>(), Focal.prop("activity"));

const toggleBoolean = (value: boolean) => !value;

const backlogItemById = (id: string | null) =>
	pipe(
		Backlog,
		Focal.first((item) => item.id === id),
	);

const addLogActivity =
	(fn: Fn<BacklogItem, string>) => (item: M.Maybe<BacklogItem>) => (logs: string[]) =>
		M.isJust(item) ? [fn(item.value), ...logs] : logs;

const toggleItemStatus = (status: BacklogItemStatus): BacklogItemStatus =>
	status === "todo" ? "doing" : status === "doing" ? "done" : "todo";

export const actions = {
	setQuery: action((query: string) => pipe(Filters, Focal.prop("query"), Focal.set(query))),
	setKindFilter: action((kind: BacklogItemKind | "all") =>
		pipe(Filters, Focal.prop("kind"), Focal.set(kind)),
	),
	togglePinnedOnly: action(() =>
		pipe(
			Filters,
			Focal.prop("showPinnedOnly"),
			Focal.modify((value) => !value),
		),
	),
	selectItem: action((id: string) => {
		const setId = pipe(UI, Focal.optional("selectedId"), Focal.set(id));
		const prependLog = addLogActivity((item) => `Selected ${item.title}`);
		const setActivity = pipe(Activity, Focal.modifyWith(backlogItemById(id), prependLog));
		return flow(setId, setActivity);
	}),
	cycleStatus: action((id: string) => {
		const Selected = backlogItemById(id);
		const Status = pipe(Selected, Focal.prop("status"));
		const setStatus = pipe(Status, Focal.modify(toggleItemStatus));
		const prependLog = addLogActivity((item) => `Moved ${item.title} to ${item.status}`);
		const setActivity = pipe(Activity, Focal.modifyWith(backlogItemById(id), prependLog));
		return flow(setStatus, setActivity);
	}),
	togglePinned: action((id: string) => {
		const Selected = backlogItemById(id);
		const Pinned = pipe(Selected, Focal.prop("pinned"));
		const setPinned = pipe(Pinned, Focal.modify(toggleBoolean));
		const prependLog = addLogActivity(
			(item) => `${item.pinned ? "Pinned" : "Unpinned"} ${item.title}`,
		);
		const setActivity = pipe(Activity, Focal.modifyWith(backlogItemById(id), prependLog));
		return flow(setPinned, setActivity);
	}),
	setPreview: action((preview: UIPreview) => pipe(UI, Focal.prop("preview"), Focal.set(preview))),
	toggleCompact: action(() => pipe(UI, Focal.prop("compact"), Focal.modify(toggleBoolean))),
	setDraftTitle: action((title: string) =>
		pipe(Focal.from<LabState>(), Focal.prop("draft.title"), Focal.set(title)),
	),
	setDraftKind: action((kind: BacklogItemKind) =>
		pipe(Focal.from<LabState>(), Focal.prop("draft.kind"), Focal.set(kind)),
	),
	setDraftEstimate: action((estimate: number) =>
		pipe(Focal.from<LabState>(), Focal.prop("draft.estimate"), Focal.set(estimate)),
	),
	setDraftTags: action((tags: string) =>
		pipe(Focal.from<LabState>(), Focal.prop("draft.tags"), Focal.set(tags)),
	),
	addDraft: action(() => (state: LabState): LabState => {
		const title = state.draft.title.trim();
		if (!title) return state;

		const id = `item-${state.backlog.length + 1}`;
		const tags = state.draft.tags
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);

		const newItem: BacklogItem = {
			id,
			title,
			kind: state.draft.kind,
			status: "todo",
			estimate: state.draft.estimate,
			tags,
			pinned: false,
		};

		return pipe(
			state,
			pipe(
				Backlog,
				Focal.modify((items) => [newItem, ...items]),
			),
			pipe(UI, Focal.optional("selectedId"), Focal.set(id)),
			pipe(
				Focal.from<LabState>(),
				Focal.prop("draft"),
				Focal.set({ title: "", kind: "feature" as BacklogItemKind, estimate: 1, tags: "" }),
			),
			pipe(
				Activity,
				Focal.modify((logs) => [`Added ${title}`, ...logs]),
			),
		);
	}),
	clearDone: action(() => (state: LabState): LabState => {
		const filtered = state.backlog.filter((item) => item.status !== "done");
		const selectedStillExists = filtered.some((item) => item.id === state.ui.selectedId);
		const newSelectedId = selectedStillExists ? state.ui.selectedId : (filtered[0]?.id ?? null);

		const setBacklog = pipe(Backlog, Focal.set(filtered));
		const setSelectedId = pipe(
			UI,
			Focal.modify((ui) => ({ ...ui, selectedId: newSelectedId })),
		);
		const prependLog = pipe(
			Activity,
			Focal.modify((logs: string[]) => ["Cleared done items", ...logs]),
		);

		return flow(setBacklog, setSelectedId, prependLog)(state);
	}),
};
