import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const BLOG_DIR = path.join(ROOT_DIR, "docs/src/content/docs/blog");

const DEVTO_API_KEY = process.env.DEVTO_API_KEY || "erJDaFCTuRRYGmn3kUtKNbYK";

if (!DEVTO_API_KEY) {
  console.error("❌ Error: DEVTO_API_KEY environment variable is missing.");
  process.exit(1);
}

// Convert relative markdown links to absolute URLs pointing to oofp.pages.dev
function convertLinksToAbsolute(markdown) {
  return markdown.replace(/\]\(([^)]+)\)/g, (match, href) => {
    const trimmedHref = href.trim();
    if (
      trimmedHref.startsWith("http://") ||
      trimmedHref.startsWith("https://") ||
      trimmedHref.startsWith("mailto:") ||
      trimmedHref.startsWith("#")
    ) {
      return match;
    }
    const cleanPath = trimmedHref.replace(/^(\.|\/)+/, "");
    return `](https://oofp.pages.dev/${cleanPath})`;
  });
}

// Simple YAML frontmatter parser
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content };

  const yamlStr = match[1];
  const markdownBody = match[2];
  const data = {};

  let currentKey = null;
  for (const line of yamlStr.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- ") && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(trimmed.replace(/^-\s*/, "").replace(/^["']|["']$/g, ""));
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx !== -1) {
      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();

      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);

      data[key] = value;
      currentKey = key;
    }
  }

  return { data, body: markdownBody };
}

// Helper to format tags for DEV.to (max 4, lowercase, alphanumeric)
function formatTags(tags = []) {
  const devToAllowed = ["typescript", "javascript", "webdev", "programming", "node"];
  const formatted = tags
    .map((t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length > 0);

  const combined = Array.from(new Set([...formatted, ...devToAllowed]));
  return combined.slice(0, 4);
}

async function fetchExistingArticles() {
  try {
    const res = await fetch("https://dev.to/api/articles/me/all?per_page=1000", {
      headers: { "api-key": DEVTO_API_KEY },
    });
    if (!res.ok) {
      console.warn("⚠️ Could not fetch existing articles list. Code:", res.status);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error("⚠️ Failed to check existing DEV.to articles:", err.message);
    return [];
  }
}

async function publishOrUpdateArticle(file, existingArticleMap) {
  const filePath = path.join(BLOG_DIR, file);
  const rawContent = fs.readFileSync(filePath, "utf-8");
  const { data, body } = parseFrontmatter(rawContent);

  const slug = file.replace(/\.mdx?$/, "");
  const title = data.title || slug;
  const canonicalUrl = `https://oofp.pages.dev/blog/${slug}/`;
  const description = data.excerpt || data.description || "";
  const tags = formatTags(Array.isArray(data.tags) ? data.tags : []);

  // Transform relative links to absolute URLs pointing to oofp.pages.dev
  const processedBody = convertLinksToAbsolute(body);

  const existingArticle = existingArticleMap.get(canonicalUrl);

  const payload = {
    article: {
      title,
      published: true,
      body_markdown: processedBody,
      canonical_url: canonicalUrl,
      description,
      tags,
    },
  };

  if (existingArticle) {
    console.log(`\n🔄 Updating existing article ID ${existingArticle.id}: "${title}"`);
    console.log(`   Canonical URL: ${canonicalUrl}`);

    const res = await fetch(`https://dev.to/api/articles/${existingArticle.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "api-key": DEVTO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Failed to update "${title}". Error (${res.status}): ${errText}`);
      return null;
    }

    const updatedData = await res.json();
    console.log(`✅ Updated successfully! URL: ${updatedData.url}`);
    return updatedData;
  } else {
    console.log(`\n📌 Creating new article: "${title}"`);
    console.log(`   Canonical URL: ${canonicalUrl}`);

    const res = await fetch("https://dev.to/api/articles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": DEVTO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Failed to publish "${title}". Error (${res.status}): ${errText}`);
      return null;
    }

    const publishedData = await res.json();
    console.log(`✅ Published successfully! URL: ${publishedData.url}`);
    return publishedData;
  }
}

async function main() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`Directory not found: ${BLOG_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  console.log(`🔍 Found ${files.length} blog post(s) in ${BLOG_DIR}`);

  const existing = await fetchExistingArticles();
  const existingArticleMap = new Map();
  for (const item of existing) {
    if (item.canonical_url) {
      existingArticleMap.set(item.canonical_url, item);
    }
  }

  for (const file of files) {
    await publishOrUpdateArticle(file, existingArticleMap);
    // Rate limit delay: wait 2 seconds between updates/posts
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n✨ Crossposting check & update complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
