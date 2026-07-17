import { BlockManifest } from "./BlockManifest.js";
import type { VariantsRouter } from "./types.js";
import type { NestedBlocksBinding } from "./nestedBlocks.js";
export type DiscoverRegistryEntry<TBlockData extends Record<string, any> = Record<string, any>> = {
    variantsRouter?: VariantsRouter<Partial<TBlockData>>;
    nestedBlocks?: NestedBlocksBinding<TBlockData>[];
    /**
     * Derived from per-variant `nestedBlocks` on loaded configs. When present,
     * preferred over parent `nestedBlocks` for the resolved variant (unlisted
     * variants get no nesting — they do not inherit the parent).
     */
    variantNestedBlocks?: Record<string, NestedBlocksBinding<TBlockData>[]>;
};
export type DiscoverBlocksOptions<TBlockData extends Record<string, any> = Record<string, any>> = {
    blockIdField?: keyof TBlockData;
    registry?: Record<string, DiscoverRegistryEntry<TBlockData>>;
    manifest?: BlockManifest<TBlockData>;
};
export declare function discoverBlocks<TBlockData extends Record<string, any> = Record<string, any>>(blocksData: Partial<TBlockData>[] | undefined | null, options?: DiscoverBlocksOptions<TBlockData>): BlockManifest<TBlockData>;
//# sourceMappingURL=discoverBlocks.d.ts.map