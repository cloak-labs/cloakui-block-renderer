import { BlockManifest } from "./BlockManifest.js";
import { treesFromNestedBlocks } from "./nestedBlocks.js";
import type { VariantsRouter } from "./types.js";
import type { NestedBlocksBinding } from "./nestedBlocks.js";

export type DiscoverRegistryEntry<
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  variantsRouter?: VariantsRouter<Partial<TBlockData>>;
  nestedBlocks?: NestedBlocksBinding<TBlockData>[];
  /**
   * Derived from per-variant `nestedBlocks` on loaded configs. When present,
   * preferred over parent `nestedBlocks` for the resolved variant (unlisted
   * variants get no nesting — they do not inherit the parent).
   */
  variantNestedBlocks?: Record<string, NestedBlocksBinding<TBlockData>[]>;
};

export type DiscoverBlocksOptions<
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  blockIdField?: keyof TBlockData;
  registry?: Record<string, DiscoverRegistryEntry<TBlockData>>;
  manifest?: BlockManifest<TBlockData>;
};

const defaultBlockIdField = "name" as const;

export function discoverBlocks<
  TBlockData extends Record<string, any> = Record<string, any>,
>(
  blocksData: Partial<TBlockData>[] | undefined | null,
  options: DiscoverBlocksOptions<TBlockData> = {},
): BlockManifest<TBlockData> {
  const {
    blockIdField = defaultBlockIdField as keyof TBlockData,
    registry = {},
    manifest = new BlockManifest<TBlockData>(),
  } = options;

  manifest.resetDiscovered();

  const walk = (blocks: Partial<TBlockData>[] | undefined | null) => {
    if (!blocks?.length) return;

    for (const block of blocks) {
      const blockId = block[blockIdField] as string | undefined;
      if (!blockId) continue;

      manifest.discover(block, blockId);

      const entry = registry[blockId];
      if (!entry) continue;

      const variant = entry.variantsRouter?.(
        block as Parameters<NonNullable<typeof entry.variantsRouter>>[0],
      );
      // When a per-variant map exists, omit unlisted variants — do not inherit
      // parent nestedBlocks (e.g. carousel must not walk grid injections).
      const nestedBlocks =
        entry.variantNestedBlocks && typeof variant === "string"
          ? entry.variantNestedBlocks[variant]
          : entry.nestedBlocks;

      if (!nestedBlocks?.length) continue;

      for (const childBlocks of treesFromNestedBlocks(nestedBlocks, block)) {
        walk(childBlocks);
      }
    }
  };

  walk(blocksData);

  return manifest;
}
