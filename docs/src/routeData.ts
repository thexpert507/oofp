import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

const siteUrl = new URL("https://oofp.pages.dev");

type EntryData = {
	title: string;
	description?: string;
	excerpt?: string;
	date?: Date | string;
};

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	const isIndexRoute =
		route.id === "" ||
		route.id === "blog" ||
		route.id.startsWith("blog/authors/") ||
		route.id.startsWith("blog/tags/");

	if (isIndexRoute) {
		return;
	}

	const data = route.entry.data as EntryData;
	const path = `/${route.id.replace(/\/$/, "")}/`;
	const pageUrl = new URL(path, siteUrl).href;
	const datePublished = data.date ? new Date(data.date).toISOString() : undefined;
	const dateModified = route.lastUpdated?.toISOString();

	const articleStructuredData = {
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: data.title,
		description: data.description ?? data.excerpt,
		url: pageUrl,
		mainEntityOfPage: pageUrl,
		inLanguage: "en",
		author: {
			"@type": "Person",
			name: "Adriel Avila",
			url: "https://github.com/thexpert507",
		},
		publisher: {
			"@type": "Organization",
			name: "OOFP",
			url: siteUrl.href,
		},
		about: {
			"@id": `${siteUrl.href}#software`,
		},
		...(datePublished ? { datePublished } : {}),
		...(dateModified ? { dateModified } : {}),
	};

	route.head.push({
		tag: "script",
		attrs: {
			type: "application/ld+json",
		},
		content: JSON.stringify(articleStructuredData),
	});
});
