# `@cloakui/block-renderer`

Framework-agnostic engine for turning a JSON tree of UI “blocks” into rendered output.

You supply:

1. A **blocks config** — map block IDs → component + optional data router / variants / nesting
2. **`renderBlock` / `combineBlocks`** — how prepared blocks become framework output (React, Vue, etc.)

The library handles lookup, variants, data routing, nested trees, plugins, providers, and discovery. It does not depend on React (or any UI framework).

```bash
npm i @cloakui/block-renderer
```

---

## Quick start (React)

```ts
import { BlockRenderer } from "@cloakui/block-renderer";
import { Paragraph } from "@components/Paragraph";
import { Group } from "@components/Group";

type MyBlock = { name: string; data?: Record<string, unknown>; innerBlocks?: MyBlock[] };

const renderer = new BlockRenderer<React.ComponentType<any>, React.ReactNode, MyBlock>({
  blockIdField: "name",
  // tell the renderer how to render a block's component:
  renderBlock: ({ Component, props, block }) => (
    <Component key={block.context?.index} {...props} />
  ),
  // optionally wrap/modify the final rendered output:
  combineBlocks: (rendered) => rendered,
  // define all block types, how data maps to props (data routers), and their UI components:
  blocks: {
    "core/paragraph": {
      component: Paragraph,
      dataRouter: (block) => ({ children: block.data?.content }),
    },
    "core/group": {
      component: Group,
      dataRouter: () => ({}),
      nestedBlocks: [
        {
          // tell the renderer how to find nested blocks:
          trees: (block) =>
            block.innerBlocks?.length ? [{ blocks: block.innerBlocks }] : [],
          // tell the renderer how to inject the rendered output of nested blocks into the parent component's props:
          attach: (props, rendered) => {
            props.children = rendered[0]?.output;
          },
        },
      ],
    },
  },
});

const tree = renderer.render(page.blocks); // eg. page is JSON fetched from a CMS
// for this React example, output the result in JSX like `return (<div>{tree}</div>);`
```

---

## Concepts

### Blocks config

Each entry is keyed by the block ID field (default-friendly: `name`):

| Field                         | Purpose                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `component`                   | UI component for this block                                                                                              |
| `dataRouter`                  | A function that receives the block's data and context within the tree, and returns props to be spread onto the component |
| `meta`                        | Arbitrary metadata (plugins often read this)                                                                             |
| `nestedBlocks`                | How to find, render, and attach child trees                                                                              |
| `variantsRouter` + `variants` | Allows different versions of a single block to define unique data routers & components.                                  |

Configs can be a single object or an **array of objects** that are deep-merged in the constructor.

```ts
blocks: [
  coreBlocks, // an array of block configs
  projectOverrides, // 2nd array of block configs, which can override specific parts of individual block configs in coreBlocks
];
```

### Variants

```ts
"hero-block": {
  variantsRouter: (block) => block.data?.layout ?? "default",
  variants: {
    default: { component: HeroDefault, dataRouter: heroDataRouter },
    bgImage: { component: HeroWithBgImage, dataRouter: withBgImage(heroDataRouter) },
  },
  // shared nesting for all variants (if applicable):
  nestedBlocks: [...],
}
```

A variant may declare its own `nestedBlocks`. When present, that overrides the parent’s nesting for discovery and render (unlisted variants do not inherit parent nesting).

### Data routers

Data routers turn CMS/API block data into component props (keeping this mapping logic out of your UI components for true separation of concerns). They receive:

- `block` — including `context` and config `meta`
- `blockRenderer` — the current `BlockRenderer` instance

Global post-processing goes through `hooks.filters.dataRouterResult`.

### Nested blocks

Nesting is declarative via `nestedBlocks` bindings (because not all trees will have the same nesting shape):

```ts
type NestedBlocksBinding = {
  /** Child trees (also used by discovery — walk only). */
  trees: (block) => { blocks: Block[]; meta?: Record<string, unknown> }[];

  /** Extra render options (fromParent, fromAncestors, …). `parent` is always set. */
  renderOptions?: (block, props) => Omit<RenderOptions, "parent">;

  /** Merge rendered output into the parent’s data-router props. */
  attach: (props, rendered) => void | Record<string, any>;
};
```

Example — render `block.innerBlocks` into `children` prop:

```ts
const innerBlocksChildren = {
  trees: (block) =>
    block.innerBlocks?.length ? [{ blocks: block.innerBlocks }] : [],
  attach: (props, rendered) => {
    props.children = rendered[0]?.output;
  },
};
```

**Advanced:** nested `render()` calls go through `hooks.filters.nestedRenderOptions` so plugins can push composed ancestor context (layout slots, theme tokens, etc.) down the tree.

### Block context

Each prepared block gets `context`:

| Key                           | Meaning                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `parent`                      | Parent block object (when nested)                                                                                  |
| `index`                       | Index among siblings                                                                                               |
| `prevSibling` / `nextSibling` | Adjacent block objects in the same array                                                                           |
| `fromParent`                  | Per-hop extras from the immediate parent / this `render()` call. Usually replaced at each nesting boundary.        |
| `fromAncestors`               | Opaque bag composed down the ancestor chain (e.g. layout slots). Usually set by plugins via `nestedRenderOptions`. |

`fromAncestors` is intentionally untyped at this layer — owning packages define their own keys.

### Plugins

Plugins are functions `(config, { executionCount, processedBlocks }) => config`. They run in order when a `BlockRenderer` is constructed from its user-provided config, and sequentially modify/decorate that config.

Typical uses: default `meta`, wrapping `renderBlock` / `combineBlocks`, registering `nestedRenderOptions`.

```ts
const myPlugin = (config, { executionCount }) => {
  if (executionCount > 1) return config;
  return {
    // returns regular BlockRenderer config, with modifications
    ...config,
    hooks: {
      filters: {
        ...config.hooks?.filters,
        nestedRenderOptions: (options, ctx) => ({
          ...options,
          fromAncestors: {
            ...options.fromAncestors,
            /* … */
          },
        }),
      },
    },
  };
};
```

### Providers

Root-level wrappers applied only when `render()` has no `parent`. Each provider has a `condition({ blocks, manifest })` and a `component` that receives `{ children }`. For example, a block that renders a Lightbox component might require a single Context Provider component to be higher up the tree; you wouldn't want to always include it on every page, because maybe that block is only used on 1 or 2 pages, and you wouldn't want to wrap every block instance, because if you have 2 or more of those blocks on the same page, things could get weird (depends); by setting it up as a conditional provider, it can wrap the block component tree only when that block is included on the page.

Unlike block components, providers are invoked directly by `BlockRenderer` (they must be plain callables).

### Manifest & discovery

`BlockManifest` tracks:

- **discovered** — from `renderer.discover(blocksData)` (useful to gain insight into your blocks tree before actually running data routers or rendering anything -- see Performance/Bundle Considerations below re: dynamic module loading)
- **rendered** — from the latest root `render()` (useful for post-render analysis of what actually rendered)

```ts
const manifest = renderer.discover(page.blocks);
if (manifest.didDiscover("gallery-block")) {
  // load gallery module, register providers, etc.
}
```

`discover` walks `nestedBlocks` trees (and per-variant nesting when known).

### `mergeConfigWith`

Returns a **new** `BlockRenderer` with deep-merged config (plugins re-run). Plugin bookkeeping (`__processedBlocks`, `__executionCounts`) is cloned so singleton base renderers stay safe across requests.

```ts
const pageRenderer = baseRenderer.mergeConfigWith({
  blocks: await loadBlocksForPage(page.blocks),
});
```

---

## API surface

| Export                                        | Role                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `BlockRenderer`                               | Main class: `render`, `discover`, `mergeConfigWith`, …                  |
| `BlockManifest`                               | Discovered / rendered block records                                     |
| `discoverBlocks`                              | Standalone discovery walk                                               |
| `applyNestedBlocks` / `treesFromNestedBlocks` | Nesting helpers                                                         |
| Types                                         | `BlocksConfig`, `DataRouter`, `NestedBlocksBinding`, `RenderOptions`, … |

---

## Performance / bundle considerations

This package is small and framework-agnostic. **Client bundle size is almost entirely a user-land concern**: which components you put in the blocks config, and whether those modules are loaded eagerly or only when a page actually contains them.

A pattern that works well with Next.js App Router (React Server Components):

1. Keep a **tiny server-only core renderer** (shell: `renderBlock`, plugins, maybe a few always-needed core blocks).
2. Register every heavy / interactive block as a **lazy module** in a registry of dynamic `import()`s.
3. On each page request, **`discover` the block tree first**, load only the modules that appear, `mergeConfigWith` those configs, then `render` in an RSC.
4. Mark interactive leaves with `"use client"`; keep the page entry and renderer assembly on the server so unused client components never enter the client graph.

### Example: discover → dynamic import → RSC render

`@cloakui/block-renderer` only supplies `discover` and `mergeConfigWith`. The registry and page wiring are yours. Minimal shape:

```ts
// loaders.ts (server) — map block IDs to dynamic imports
export const blockLoaders = {
  "gallery-block": () => import("./modules/gallery"),
  "hero-block": () => import("./modules/hero"),
} as const;
```

```ts
// createPageBlockRenderer.ts
import "server-only";
import { blockLoaders } from "./loaders";

export async function createPageBlockRenderer(blocksData) {
  // Walk the tree (including nestedBlocks) without running data routers
  const manifest = coreRenderer.discover(blocksData);

  // Import only modules for block names that appear on this page
  const entries = await Promise.all(
    [...manifest.discoveredNames]
      .filter((name): name is keyof typeof blockLoaders => name in blockLoaders)
      .map(async (name) => {
        const mod = await blockLoaders[name]();
        return [name, mod.blockConfig] as const;
      }),
  );

  return coreRenderer.mergeConfigWith({
    blocks: Object.fromEntries(entries),
  });
}
```

```tsx
// modules/gallery/index.ts
// Client UI lives behind "use client"; this module is only imported
// when discover() finds gallery-block on the page.
import { Gallery } from "./Gallery";

export const blockConfig = {
  component: Gallery,
  dataRouter: galleryDataRouter,
};
```

```tsx
// app/[[...slug]]/page.tsx — React Server Component
export default async function Page({ params }) {
  const { blocks } = await fetchPage(params);
  const renderer = await createPageBlockRenderer(blocks);
  return <>{renderer.render(blocks)}</>;
}
```

**Why this keeps the client bundle small**

- The RSC page never statically imports every block module, so bundlers don’t pull them into a shared client chunk “just in case.”
- `discover` + `nestedBlocks` finds nested trees without rendering first.
- Client boundaries stay at interactive leaves; the renderer shell and data routers can stay server-side.

**When the minimal example isn’t enough**

Real CMS trees often need more user-land machinery on top of the same APIs:

- **Nesting overlay** — if a block’s `nestedBlocks` only exist on its lazy module, a first `discover` can’t see those children yet. Pass a lightweight `registry` into `discover` (nesting + `variantsRouter` only) so the walk can find nested blocks before the module loads.
- **Variant loaders** — load `hero/video` separately from `hero/default` instead of one module per block name.
- **Multi-pass** — after loading configs that declare more `nestedBlocks`, `discover` again and load any newly found modules.

Those are application concerns. This package stops at `discover` / `mergeConfigWith` / nested tree walking. Just know that the package was designed with those application concerns in mind.

---

## License

LGPL-3.0-only
