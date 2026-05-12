import type { BlockRendererConfig, BlockDataWithExtraContext, RenderPreparedBlock, EmptyObjectOrRecord, RenderOptions } from "./types.js";
import { DeepPartial } from "ts-essentials";
export declare class BlockRenderer<TComponent extends (props: any) => any = (props: any) => any, TRenderOutput = any, TBlockData extends Record<string, any> = Record<string, any>> {
    protected _config: BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>;
    /** This property holds the full array of blocks data that is currently being rendered. */
    protected _blocksData: Partial<TBlockData>[];
    protected _meta: Record<string, any>;
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
}
//# sourceMappingURL=BlockRenderer.d.ts.map