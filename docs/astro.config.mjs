// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightBlog from "starlight-blog";
import starlightThemeBlack from "starlight-theme-black";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://oofp.pages.dev",
  integrations: [
    starlight({
      title: "OOFP",
      description:
        "Object-Oriented Functional Programming ecosystem for TypeScript. Algebraic data types, dependency injection, and type-safe composition.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/thexpert507/oofp",
        },
      ],
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: false,
      },
      customCss: ["./src/styles/custom.css"],
      editLink: {
        baseUrl: "https://github.com/thexpert507/oofp/edit/main/docs/",
      },
      head: [
        {
          tag: "script",
          content: `if (!localStorage.getItem('starlight-theme')) { localStorage.setItem('starlight-theme', 'dark'); }`,
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://oofp.pages.dev/og-image.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:card",
            content: "summary_large_image",
          },
        },
      ],
      plugins: [
        starlightThemeBlack({
          navLinks: [
            { label: "Docs", link: "/getting-started/introduction/" },
            { label: "Blog", link: "/blog/" },
          ],
          footerText: "Built with [Astro](https://astro.build) & [Starlight](https://starlight.astro.build). MIT License.",
        }),
        starlightBlog({
          title: "Blog",
          authors: {
            thexpert507: {
              name: "Adriel Avila",
              url: "https://github.com/thexpert507",
            },
          },
        }),
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "getting-started/introduction" },
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
          ],
        },
        {
          label: "Core Concepts",
          items: [
            { label: "Pipe, Flow & Compose", slug: "core/composition" },
            { label: "Maybe", slug: "core/maybe" },
            { label: "Either", slug: "core/either" },
            { label: "Task", slug: "core/task" },
            { label: "TaskEither", slug: "core/task-either" },
            { label: "Reader", slug: "core/reader" },
            { label: "ReaderTaskEither", slug: "core/reader-task-either" },
            { label: "IO", slug: "core/io" },
            { label: "State", slug: "core/state" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Error Handling", slug: "guides/error-handling" },
            { label: "Side Effects", slug: "guides/side-effects" },
            {
              label: "Concurrency & Sequencing",
              slug: "guides/concurrency",
            },
            {
              label: "Applicative Pattern",
              slug: "guides/applicative-pattern",
            },
            {
              label: "Dependency Injection",
              slug: "guides/dependency-injection",
            },
            { label: "Type Conversions", slug: "guides/type-conversions" },
          ],
        },
        {
          label: "Packages",
          items: [
            { label: "@oofp/core", slug: "packages/core" },
            { label: "@oofp/http", slug: "packages/http" },
            { label: "@oofp/query", slug: "packages/query" },
            { label: "@oofp/saga", slug: "packages/saga" },
            { label: "@oofp/react", slug: "packages/react" },
          ],
        },
        {
          label: "Advanced",
          items: [
            {
              label: "Type Classes & HKT",
              slug: "advanced/type-classes-hkt",
            },
            { label: "Monad Transformers", slug: "advanced/monad-transformers" },
            { label: "Ref & Lenses", slug: "advanced/ref-lenses" },
            {
              label: "Production Patterns",
              slug: "advanced/production-patterns",
            },
          ],
        },
        {
          label: "Utilities",
          items: [
            { label: "List", slug: "utilities/list" },
            { label: "Object", slug: "utilities/object" },
            { label: "String", slug: "utilities/string" },
            { label: "Curry, Memo & Id", slug: "utilities/curry-memo-id" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Benchmarks", slug: "reference/benchmarks" },
          ],
        },
      ],
    }),
    sitemap(),
  ],
});
