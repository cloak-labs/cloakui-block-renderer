import type { BlockRenderer } from "./BlockRenderer.js";

// export type DataRouterResultFilter<TComponent, TRenderOutput, TBlockData> =
//   FilterHookFunction<
//     Record<string, any>,
//     {
//       block: BlockDataWithExtraContext<TBlockData>;
//       blockRenderer: BlockRenderer<TComponent, TRenderOutput, TBlockData>;
//     },
//     Record<string, any>
//   >;

export type BlockRendererConfig<
  TComponent extends (props: any) => any = (props: any) => any,
  TRenderOutput = any,
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  // render?: (
  //   blockComponents: RenderPreparedBlock<TComponent>[],
  //   options?: RenderOptions,
  //   blockRenderer?: BlockRenderer<TComponent, TRenderOutput, TBlockData>
  // ) => TRenderOutput;
  renderBlock: (
    component: RenderPreparedBlock<TComponent>,
    options?: RenderOptions,
    blockRenderer?: BlockRenderer<TComponent, TRenderOutput, TBlockData>,
  ) => TRenderOutput;
  combineBlocks?: (
    renderedBlocks: TRenderOutput[],
    components: RenderPreparedBlock<TComponent>[],
    options?: RenderOptions,
    blockRenderer?: BlockRenderer<TComponent, TRenderOutput, TBlockData>,
  ) => TRenderOutput | TRenderOutput[];
  hooks?: {
    filters?: {
      /** Allows you to filter the returned result of ALL data routers, so you can inject some global things, log stuff, or whatever you want. */
      dataRouterResult: FilterHookFunction<
        Record<string, any>,
        {
          block: BlockDataWithExtraContext<TBlockData>;
          blockRenderer: BlockRenderer<TComponent, TRenderOutput, TBlockData>;
        },
        Record<string, any>
      >;
    };
  };
  blocks?:
    | BlocksConfig<TComponent, TBlockData>
    | BlocksConfig<TComponent, TBlockData>[];
  /* The field in the block data that contains the block name/identifier corresponding to your block config. */
  blockIdField?: keyof TBlockData;
  /* Providers enable you to conditionally wrap all rendered blocks in provider/context/wrapper components.  */
  providers?: Record<string, ProviderConfig<TComponent, TBlockData>>;
  /* Plugins implement the decorator pattern, so they can modify the block renderer config before it's used. They get applied in sequence, running the config through a transformation pipeline. */
  plugins?: BlockRendererPlugin<TComponent, TRenderOutput, TBlockData>[];
  /* Used to track the number of times each plugin has been executed, enabling plugins to adjust their behavior for initial vs subsequent executions. */
  __executionCounts?: Map<
    BlockRendererPlugin<TComponent, TRenderOutput, TBlockData>,
    number
  >;
  /* Used to track the blocks that have been processed by plugins, enabling plugins to skip unnecessary processing for subsequent executions. */
  __processedBlocks?: Set<string>;
};

export type FilterHookFunction<TValue = any, TProps = any, TResult = any> = (
  valueToFilter: TValue,
  props?: TProps,
) => TResult;

export type EmptyObject = {};
export type EmptyObjectOrRecord<T = Record<string, any>> = T extends Record<
  string,
  any
>
  ? T
  : EmptyObject;

export type RenderPreparedBlock<
  TComponent extends (props: any) => any = (props: any) => any,
  TProps = EmptyObjectOrRecord,
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  Component: TComponent;
  props: TProps;
  block: BlockDataWithExtraContext<TBlockData>;
};

export type DataRouter<
  TProps = EmptyObjectOrRecord,
  TBlockData extends Record<string, any> = Record<string, any>,
  TComponent extends (props: any) => any = (props: any) => any,
  TBlockDataWithExtraContext = BlockDataWithExtraContext<TBlockData>,
> = (
  block: TBlockDataWithExtraContext extends BlockDataWithExtraContext<any>
    ? TBlockDataWithExtraContext
    : BlockDataWithExtraContext<TBlockData>,
  blockRenderer?: BlockRenderer<TComponent, any, TBlockData>,
) => TProps;

export type GlobalDataRouter<
  TProps = EmptyObjectOrRecord,
  TBlockData extends Record<string, any> = Record<string, any>,
> = (options: {
  block: BlockDataWithExtraContext<TBlockData>;
  props: TProps;
}) => TProps;

export type SingleBlockConfigWithoutVariants<
  TComponent extends (props: any) => any = (props: any) => any,
  TProps = EmptyObjectOrRecord,
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  dataRouter?: DataRouter<TProps, TBlockData, TComponent>;
  component?: TComponent;
  meta?: Record<string, any>;

  // Set the following to `never` as hacky way of ensuring they can't be used alongside above properties:
  variantsRouter?: never;
  variants?: never;
};

export type VariantsRouter<
  TBlockData extends Record<string, any> = Record<string, any>,
> = (block: BlockDataWithExtraContext<TBlockData>) => string;

export type SingleBlockConfigWithVariants<
  TComponent extends (props: any) => any = (props: any) => any,
  TProps = EmptyObjectOrRecord,
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  variantsRouter: VariantsRouter<TBlockData>;
  variants: {
    [key: string]: SingleBlockConfigWithoutVariants<
      TComponent,
      TProps,
      TBlockData
    >;
  };
  meta?: Record<string, any>;

  // Set the following to `never` as hacky way of ensuring they can't be used alongside variants:
  dataRouter?: never;
  component?: never;
};

export type SingleBlockConfig<
  TComponent extends (props: any) => any = (props: any) => any,
  TBlockData extends Record<string, any> = Record<string, any>,
> =
  | SingleBlockConfigWithoutVariants<
      TComponent,
      EmptyObjectOrRecord,
      TBlockData
    >
  | SingleBlockConfigWithVariants<TComponent, EmptyObjectOrRecord, TBlockData>;

export type BlocksConfig<
  TComponent extends (props: any) => any = (props: any) => any,
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  [key: string]: SingleBlockConfig<TComponent, TBlockData>;
};

export type BlockDataWithExtraContext<
  TBlockData extends Record<string, any> = Record<string, any>,
> = Partial<TBlockData> & {
  context?: BlockContext<Partial<TBlockData>>;
  meta?: Record<string, any>;
};

export type BlockContext<
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  customProps?: Record<string, any>;
  parent?: BlockDataWithExtraContext<Partial<TBlockData>> | null;
  index?: number;
  prevSibling?: TBlockData | null;
  nextSibling?: TBlockData | null;
};

export type RenderOptions<
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  parent?: BlockDataWithExtraContext<Partial<TBlockData>>;
  customProps?: Record<string, any>;
};

export type ProviderConfig<
  TComponent extends (props: any) => any = (props: any) => any,
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  condition: (args: { blocks: TBlockData[] }) => boolean;
  component: TComponent;
};

export type BlockRendererPlugin<
  TComponent extends (props: any) => any = (props: any) => any,
  TRenderOutput = any,
  TBlockData extends Record<string, any> = Record<string, any>,
> = (
  config: BlockRendererConfig<TComponent, TRenderOutput, TBlockData>,
  context: {
    executionCount: number;
    processedBlocks: Set<string>; // Track which block IDs have been processed
  },
) => BlockRendererConfig<TComponent, TRenderOutput, TBlockData>;
