export type BacklogItemKind = "feature" | "bug" | "spike";
export type BacklogItemStatus = "todo" | "doing" | "done";

export type BacklogItem = {
	id: string;
	title: string;
	kind: BacklogItemKind;
	status: BacklogItemStatus;
	estimate: number;
	tags: string[];
	pinned: boolean;
};

export type DraftItem = {
	title: string;
	kind: BacklogItem["kind"];
	estimate: number;
	tags: string;
};

export type UIPreview = "board" | "stats";

export type LabState = {
	backlog: BacklogItem[];
	filters: {
		query: string;
		kind: "all" | BacklogItem["kind"];
		showPinnedOnly: boolean;
	};
	ui: {
		selectedId: string | null;
		preview: UIPreview;
		compact: boolean;
	};
	draft: DraftItem;
	activity: string[];
};

export const initialState: LabState = {
	backlog: [
		{
			id: "item-1",
			title: "Persistent cart drawer",
			kind: "feature",
			status: "doing",
			estimate: 5,
			tags: ["checkout", "ui"],
			pinned: true,
		},
		{
			id: "item-2",
			title: "Optimistic coupon validation",
			kind: "spike",
			status: "todo",
			estimate: 3,
			tags: ["network", "cache"],
			pinned: false,
		},
		{
			id: "item-3",
			title: "Fix quantity desync on refresh",
			kind: "bug",
			status: "done",
			estimate: 2,
			tags: ["cart", "session"],
			pinned: true,
		},
	],
	filters: {
		query: "",
		kind: "all",
		showPinnedOnly: false,
	},
	ui: {
		selectedId: "item-1",
		preview: "board",
		compact: false,
	},
	draft: {
		title: "",
		kind: "feature",
		estimate: 1,
		tags: "",
	},
	activity: ["Bootstrapped state lab", "Selected Persistent cart drawer"],
};
