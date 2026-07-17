import type { BlockRenderer } from "./BlockRenderer.js";
import type { BlockManifest } from "./BlockManifest.js";
import type { NestedBlocksBinding } from "./nestedBlocks.js";
export type { NestedBlocksBinding, NestedTree } from "./nestedBlocks.js";
/**
 * The loosest shape of a renderable component: anything callable with a props
 * object, or a class/constructor that accepts one (e.g. React class components,
 * or the branded `ComponentType` unions returned by `next/dynamic`). Kept
 * framework-agnostic on purpose — render-blocks never invokes components
 * itself (except providers); the framework-specific `renderBlock` decides how
 * to render them (e.g. JSX in React).
 */
export type ComponentLike = ((props: any) => any) | (new (props: any) => any);
export type BlockRendererConfig<TComponent extends ComponentLike = ComponentLike, TRenderOutput = any, TBlockData extends Record<string, any> = Record<string, any>> = {
    renderBlock: (component: RenderPreparedBlock<TComponent>, options?: RenderOptions, blockRenderer?: BlockRenderer<TComponent, TRenderOutput, TBlockData>) => TRenderOutput;
    combineBlocks?: (renderedBlocks: TRenderOutput[], components: RenderPreparedBlock<TComponent>[], options?: RenderOptions, blockRenderer?: BlockRenderer<TComponent, TRenderOutput, TBlockData>) => TRenderOutput | TRenderOutput[];
    hooks?: {
        filters?: {
            /** Allows you to filter the returned result of ALL data routers, so you can inject some global things, log stuff, or whatever you want. */
            dataRouterResult: FilterHookFunction<Record<string, any>, {
                block: BlockDataWithExtraContext<TBlockData>;
                blockRenderer: BlockRenderer<TComponent, TRenderOutput, TBlockData>;
            }, Record<string, any>>;
        };
    };
    blocks?: BlocksConfig<TComponent, TBlockData> | BlocksConfig<TComponent, TBlockData>[];
    blockIdField?: keyof TBlockData;
    providers?: Record<string, ProviderConfig<TComponent, TBlockData>>;
    plugins?: BlockRendererPlugin<TComponent, TRenderOutput, TBlockData>[];
    __executionCounts?: Map<BlockRendererPlugin<TComponent, TRenderOutput, TBlockData>, number>;
    __processedBlocks?: Set<string>;
};
export type FilterHookFunction<TValue = any, TProps = any, TResult = any> = (valueToFilter: TValue, props?: TProps) => TResult;
export type EmptyObject = {};
export type EmptyObjectOrRecord<T = Record<string, any>> = T extends Record<string, any> ? T : EmptyObject;
export type RenderPreparedBlock<TComponent extends ComponentLike = ComponentLike, TProps = EmptyObjectOrRecord, TBlockData extends Record<string, any> = Record<string, any>> = {
    Component: TComponent;
    props: TProps;
    block: BlockDataWithExtraContext<TBlockData>;
};
export type DataRouter<TProps = EmptyObjectOrRecord, TBlockData extends Record<string, any> = Record<string, any>, TComponent extends ComponentLike = ComponentLike, TBlockDataWithExtraContext = BlockDataWithExtraContext<TBlockData>> = (block: TBlockDataWithExtraContext extends BlockDataWithExtraContext<any> ? TBlockDataWithExtraContext : BlockDataWithExtraContext<TBlockData>, blockRenderer?: BlockRenderer<TComponent, any, TBlockData>) => TProps;
export type GlobalDataRouter<TProps = EmptyObjectOrRecord, TBlockData extends Record<string, any> = Record<string, any>> = (options: {
    block: BlockDataWithExtraContext<TBlockData>;
    props: TProps;
}) => TProps;
export type SingleBlockConfigWithoutVariants<TComponent extends ComponentLike = ComponentLike, TProps = EmptyObjectOrRecord, TBlockData extends Record<string, any> = Record<string, any>> = {
    dataRouter?: DataRouter<TProps, TBlockData, TComponent>;
    component?: TComponent;
    meta?: Record<string, any>;
    nestedBlocks?: NestedBlocksBinding<TBlockData>[];
    variantsRouter?: never;
    variants?: never;
};
export type VariantsRouter<TBlockData extends Record<string, any> = Record<string, any>> = (block: BlockDataWithExtraContext<TBlockData>) => string;
export type SingleBlockConfigWithVariants<TComponent extends ComponentLike = ComponentLike, TProps = EmptyObjectOrRecord, TBlockData extends Record<string, any> = Record<string, any>> = {
    variantsRouter: VariantsRouter<TBlockData>;
    variants: {
        [key: string]: SingleBlockConfigWithoutVariants<TComponent, TProps, TBlockData>;
    };
    meta?: Record<string, any>;
    nestedBlocks?: NestedBlocksBinding<TBlockData>[];
    dataRouter?: never;
    component?: never;
};
export type SingleBlockConfig<TComponent extends ComponentLike = ComponentLike, TBlockData extends Record<string, any> = Record<string, any>> = SingleBlockConfigWithoutVariants<TComponent, EmptyObjectOrRecord, TBlockData> | SingleBlockConfigWithVariants<TComponent, EmptyObjectOrRecord, TBlockData>;
export type BlocksConfig<TComponent extends ComponentLike = ComponentLike, TBlockData extends Record<string, any> = Record<string, any>> = {
    [key: string]: SingleBlockConfig<TComponent, TBlockData>;
};
export type BlockDataWithExtraContext<TBlockData extends Record<string, any> = Record<string, any>> = Partial<TBlockData> & {
    context?: BlockContext<Partial<TBlockData>>;
    meta?: Record<string, any>;
};
export type BlockContext<TBlockData extends Record<string, any> = Record<string, any>> = {
    customProps?: Record<string, any>;
    parent?: BlockDataWithExtraContext<Partial<TBlockData>> | null;
    index?: number;
    prevSibling?: TBlockData | null;
    nextSibling?: TBlockData | null;
};
export type RenderOptions<TBlockData extends Record<string, any> = Record<string, any>> = {
    parent?: BlockDataWithExtraContext<Partial<TBlockData>>;
    customProps?: Record<string, any>;
};
export type ProviderConfig<TComponent extends ComponentLike = ComponentLike, TBlockData extends Record<string, any> = Record<string, any>> = {
    condition: (args: {
        blocks: TBlockData[];
        manifest: BlockManifest<TBlockData>;
    }) => boolean;
    /**
     * Unlike block `component`s (rendered by the framework-specific
     * `renderBlock`), providers are invoked directly by `BlockRenderer`, so they
     * must be plain callables (class components are not supported here).
     */
    component: Extract<TComponent, (props: any) => any>;
};
export type BlockRendererPlugin<TComponent extends ComponentLike = ComponentLike, TRenderOutput = any, TBlockData extends Record<string, any> = Record<string, any>> = (config: BlockRendererConfig<TComponent, TRenderOutput, TBlockData>, context: {
    executionCount: number;
    processedBlocks: Set<string>;
}) => BlockRendererConfig<TComponent, TRenderOutput, TBlockData>;
//# sourceMappingURL=types.d.ts.map