import type { BlockRendererConfig, BlockDataWithExtraContext, ComponentLike, RenderPreparedBlock, EmptyObjectOrRecord, RenderOptions } from "./types.js";
import { DeepPartial } from "ts-essentials";
import { BlockManifest } from "./BlockManifest.js";
import { type DiscoverBlocksOptions } from "./discoverBlocks.js";
export type { BlockManifest, BlockManifestRecord } from "./BlockManifest.js";
export { discoverBlocks, type DiscoverBlocksOptions, type DiscoverRegistryEntry, } from "./discoverBlocks.js";
export { applyNestedBlocks, treesFromNestedBlocks, type NestedBlocksBinding, type NestedTree, } from "./nestedBlocks.js";
export declare class BlockRenderer<TComponent extends ComponentLike = ComponentLike, TRenderOutput = any, TBlockData extends Record<string, any> = Record<string, any>> {
    protected _config: BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>;
    /** This property holds the full array of blocks data that is currently being rendered. */
    protected _blocksData: Partial<TBlockData>[];
    protected _meta: Record<string, any>;
    protected _manifest: BlockManifest<TBlockData>;
    constructor(config: BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>);
    mergeConfigWith(config: DeepPartial<BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>>): BlockRenderer<TComponent, TRenderOutput, Partial<TBlockData>>;
    /** This method gets the raw block data array prepared/formatted for rendering. */
    getComponents(blocksData: Partial<TBlockData>[], options?: RenderOptions<TBlockData>): RenderPreparedBlock<TComponent, EmptyObjectOrRecord, Partial<TBlockData>>[];
    /** Given a formatted block data object, this method determines the correct component, runs the block's data router to get the props for that components, and returns both in the format that the `render` function expects.  */
    getComponent<TProps = EmptyObjectOrRecord>(block: BlockDataWithExtraContext<Partial<TBlockData>>): RenderPreparedBlock<TComponent, TProps, Partial<TBlockData>>;
    render(blocksData: Partial<TBlockData>[], options?: RenderOptions<TBlockData>): TRenderOutput | TRenderOutput[];
    private applyProviders;
    getConfig(): BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>;
    /** Get the full array of blocks data that is currently being rendered. */
    getBlocksData(): Partial<TBlockData>[];
    /** Get the user-defined meta that you've attached to this BlockRenderer instance. */
    getMeta(key?: string): (null | any) | Record<string, any>;
    /** Attach some user-defined meta to this BlockRenderer instance. */
    setMeta(meta: Record<string, any>): void;
    /**
     * Walk block data and record discovered blocks without running data routers
     * or rendering components. Useful for pre-render module selection.
     */
    discover(blocksData: Partial<TBlockData>[] | undefined | null, options?: Omit<DiscoverBlocksOptions<TBlockData>, "manifest" | "blockIdField">): BlockManifest<TBlockData>;
    /** Blocks recorded during the most recent root-level `render()` call. */
    getManifest(): BlockManifest<TBlockData>;
    private buildDiscoverRegistry;
}
//# sourceMappingURL=BlockRenderer.d.ts.map