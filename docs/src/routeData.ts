import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

const siteUrl = new URL("https://oofp.js.org");

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
	const isBlogPost = route.id.startsWith("blog/");
	const socialImage = isBlogPost
		? new URL(`/blog-covers/${route.id.split("/").at(-1)}.webp`, siteUrl).href
		: new URL("/og-image.png", siteUrl).href;
	const datePublished = data.date ? new Date(data.date).toISOString() : undefined;
	const dateModified = route.lastUpdated?.toISOString();

	const articleStructuredData = {
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: data.title,
		description: data.description ?? data.excerpt,
		url: pageUrl,
		mainEntityOfPage: pageUrl,
		image: socialImage,
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

	for (const [attribute, name] of [
		["property", "og:image"],
		["name", "twitter:image"],
	] as const) {
		const existing = route.head.find((entry) => entry.tag === "meta" && entry.attrs?.[attribute] === name);
		if (existing?.attrs) {
			existing.attrs.content = socialImage;
		} else {
			route.head.push({ tag: "meta", attrs: { [attribute]: name, content: socialImage } });
		}
	}

	route.head.push({
		tag: "script",
		attrs: {
			type: "application/ld+json",
		},
		content: JSON.stringify(articleStructuredData),
	});
});
