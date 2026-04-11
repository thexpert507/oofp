import { iaction } from "@oofp/react";
import { BacklogItem, LabState } from "./state";

export const actions = {
	setQuery: iaction<string, LabState>((query) => (draft: LabState) => {
		draft.filters.query = query;
	}),
	setKindFilter: iaction<LabState["filters"]["kind"], LabState>((kind) => (draft: LabState) => {
		draft.filters.kind = kind;
	}),
	togglePinnedOnly: iaction<void, LabState>(() => (draft: LabState) => {
		draft.filters.showPinnedOnly = !draft.filters.showPinnedOnly;
	}),
	selectItem: iaction<string, LabState>((id) => (draft: LabState) => {
		draft.ui.selectedId = id;
		const selected = draft.backlog.find((item) => item.id === id);
		if (selected) draft.activity.unshift(`Selected ${selected.title}`);
	}),
	cycleStatus: iaction<string, LabState>((id) => (draft: LabState) => {
		const selected = draft.backlog.find((item) => item.id === id);
		if (!selected) return;
		selected.status =
			selected.status === "todo" ? "doing" : selected.status === "doing" ? "done" : "todo";
		draft.activity.unshift(`Moved ${selected.title} to ${selected.status}`);
	}),
	togglePinned: iaction<string, LabState>((id) => (draft: LabState) => {
		const selected = draft.backlog.find((item) => item.id === id);
		if (!selected) return;
		selected.pinned = !selected.pinned;
		draft.activity.unshift(`${selected.pinned ? "Pinned" : "Unpinned"} ${selected.title}`);
	}),
	setPreview: iaction<LabState["ui"]["preview"], LabState>((preview) => (draft: LabState) => {
		draft.ui.preview = preview;
	}),
	toggleCompact: iaction<void, LabState>(() => (draft: LabState) => {
		draft.ui.compact = !draft.ui.compact;
	}),
	setDraftTitle: iaction<string, LabState>((title) => (draft: LabState) => {
		draft.draft.title = title;
	}),
	setDraftKind: iaction<BacklogItem["kind"], LabState>((kind) => (draft: LabState) => {
		draft.draft.kind = kind;
	}),
	setDraftEstimate: iaction<number, LabState>((estimate) => (draft: LabState) => {
		draft.draft.estimate = estimate;
	}),
	setDraftTags: iaction<string, LabState>((tags) => (draft: LabState) => {
		draft.draft.tags = tags;
	}),
	addDraft: iaction<void, LabState>(() => (draft: LabState) => {
		const title = draft.draft.title.trim();
		if (!title) return;
		const id = `item-${draft.backlog.length + 1}`;
		const tags = draft.draft.tags
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);
		draft.backlog.unshift({
			id,
			title,
			kind: draft.draft.kind,
			status: "todo",
			estimate: draft.draft.estimate,
			tags,
			pinned: false,
		});
		draft.ui.selectedId = id;
		draft.draft = { title: "", kind: "feature", estimate: 1, tags: "" };
		draft.activity.unshift(`Added ${title}`);
	}),
	clearDone: iaction<void, LabState>(() => (draft: LabState) => {
		draft.backlog = draft.backlog.filter((item) => item.status !== "done");
		if (!draft.backlog.some((item) => item.id === draft.ui.selectedId)) {
			draft.ui.selectedId = draft.backlog[0]?.id ?? null;
		}
		draft.activity.unshift("Cleared done items");
	}),
};
