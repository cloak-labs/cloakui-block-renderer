import type { BlockDataWithExtraContext, ComponentLike, RenderOptions } from "./types.js";
import type { BlockRenderer } from "./BlockRenderer.js";
export type NestedTree<TBlockData extends Record<string, any> = Record<string, any>> = {
    blocks: Partial<TBlockData>[];
    meta?: Record<string, unknown>;
};
export type NestedBlocksBinding<TBlockData extends Record<string, any> = Record<string, any>, TRenderOutput = unknown> = {
    /** Child trees — also used for discovery (walk only; never attach/render). */
    trees: (block: Partial<TBlockData>) => NestedTree<TBlockData>[];
    /**
     * Options passed into renderer.render() for these trees.
     * `parent` is always the current block; this adds fromParent etc.
     */
    renderOptions?: (block: Partial<TBlockData>, props: Record<string, any>) => Omit<RenderOptions<TBlockData>, "parent">;
    /** Merge rendered outputs into data-router props. */
    attach: (props: Record<string, any>, rendered: {
        output: TRenderOutput | TRenderOutput[];
        meta?: Record<string, unknown>;
    }[]) => void | Record<string, any>;
};
/** Extract child block trees from nestedBlocks bindings (discovery). */
export declare function treesFromNestedBlocks<TBlockData extends Record<string, any> = Record<string, any>>(bindings: NestedBlocksBinding<TBlockData>[] | undefined, block: Partial<TBlockData>): Partial<TBlockData>[][];
export declare function applyNestedBlocks<TComponent extends ComponentLike = ComponentLike, TRenderOutput = any, TBlockData extends Record<string, any> = Record<string, any>>(props: Record<string, any>, block: BlockDataWithExtraContext<Partial<TBlockData>>, bindings: NestedBlocksBinding<TBlockData, TRenderOutput>[] | undefined, renderer: BlockRenderer<TComponent, TRenderOutput, TBlockData>): Record<string, any>;
//# sourceMappingURL=nestedBlocks.d.ts.map