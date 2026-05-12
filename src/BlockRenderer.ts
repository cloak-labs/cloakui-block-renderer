import type {
  BlockRendererConfig,
  BlockContext,
  BlockDataWithExtraContext,
  RenderPreparedBlock,
  EmptyObjectOrRecord,
  RenderOptions,
} from "./types.js";
import { deepMerge } from "@kaelan/deep-merge-ts";
import { DeepPartial } from "ts-essentials";

export class BlockRenderer<
  TComponent extends (props: any) => any = (props: any) => any,
  TRenderOutput = any,
  TBlockData extends Record<string, any> = Record<string, any>
> {
  protected _config: BlockRendererConfig<
    TComponent,
    TRenderOutput,
    Partial<TBlockData>
  >;

  /** This property holds the full array of blocks data that is currently being rendered. */
  protected _blocksData: Partial<TBlockData>[] = [];
  protected _meta: Record<string, any> = {};

  constructor(
    config: BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>
  ) {
    let {
      blocks,
      plugins = [],
      __executionCounts = new Map(),
      __processedBlocks = new Set(),
    } = config;

    // if user provides an array of blockConfigs, we take care of deep merging them together before setting the final config:
    if (blocks && Array.isArray(blocks)) {
      const [target, ...sources] = blocks;
      blocks = deepMerge(target, ...sources);
    }

    // Start with base config
    let finalConfig: BlockRendererConfig<
      TComponent,
      TRenderOutput,
      Partial<TBlockData>
    > = {
      combineBlocks: (renderedBlocks) => renderedBlocks,
      ...config,
      hooks: {
        filters: {
          dataRouterResult: (value) => value,
          ...config.hooks?.filters,
        },
      },
      blocks,
    };

    // Apply plugins with execution context
    finalConfig = plugins.reduce((currentConfig, plugin) => {
      const executionCount = (__executionCounts.get(plugin) || 0) + 1;
      __executionCounts.set(plugin, executionCount);

      return plugin(currentConfig, {
        executionCount,
        processedBlocks: __processedBlocks,
      });
    }, finalConfig);

    finalConfig.__executionCounts = __executionCounts;
    finalConfig.__processedBlocks = __processedBlocks;
    this._config = finalConfig;
  }

  mergeConfigWith(
    config: DeepPartial<
      BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>
    >
  ) {
    const mergedConfig = deepMerge<
      BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>,
      DeepPartial<
        BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>
      >[]
    >(this._config, config);

    return new BlockRenderer<TComponent, TRenderOutput, Partial<TBlockData>>(
      mergedConfig
    );
  }

  /** This method gets the raw block data array prepared/formatted for rendering. */
  getComponents(
    blocksData: Partial<TBlockData>[],
    options?: RenderOptions<TBlockData>
  ): RenderPreparedBlock<
    TComponent,
    EmptyObjectOrRecord,
    Partial<TBlockData>
  >[] {
    if (!blocksData || !blocksData.length) return [];
    const { parent, customProps } = options ?? {};

    let blocks = [];
    const config = this.getConfig();

    blocksData.forEach((blockData, i) => {
      const blockId = blockData[config.blockIdField];
      const blockConfig = config.blocks[blockId];

      if (!blockConfig) return;

      const context: BlockContext<Partial<TBlockData>> = {
        customProps,
        parent,
        index: i,
        prevSibling: i > 0 ? blocksData[i - 1] : null,
        nextSibling: i < blocksData.length - 1 ? blocksData[i + 1] : null,
      };

      // for each block, get its component from blocksConfig, and dataRouter to get props
      const preparedBlock = this.getComponent({
        ...blockData,
        context,
        meta: blockConfig.meta,
      });

      if (!preparedBlock) return;

      blocks.push(preparedBlock);
    });

    return blocks;
  }

  /** Given a formatted block data object, this method determines the correct component, runs the block's data router to get the props for that components, and returns both in the format that the `render` function expects.  */
  getComponent<TProps = EmptyObjectOrRecord>(
    block: BlockDataWithExtraContext<Partial<TBlockData>>
  ): RenderPreparedBlock<TComponent, TProps, Partial<TBlockData>> {
    const blockId = block[this._config.blockIdField];

    let config = this._config.blocks[blockId];
    if (!config) {
      // no luck, log error to console and return early:
      console.error(`Missing config for block "${blockId}", so we skip it.`);
      return;
    }

    // if the block has variants, we need to determine which one to use:
    if (config.variantsRouter) {
      const variant = config.variantsRouter?.(block);
      config = config.variants[variant];
      if (!config) {
        console.error(
          `Missing variant config for "${variant}" in the block "${blockId}", so we skip it.`
        );
        return;
      }
    }

    if (!config.component) {
      console.error(`Missing component for block "${blockId}", so we skip it.`);
      return;
    }

    const { filters } = this._config.hooks;

    // call the block's dataRouter to receive its props
    let dataRouterProps = filters.dataRouterResult(
      config.dataRouter?.(block, this) ?? {},
      { block, blockRenderer: this }
    );

    return {
      Component: config.component,
      props: dataRouterProps as TProps,
      block,
    };
  }

  render(
    blocksData: Partial<TBlockData>[],
    options?: RenderOptions<TBlockData>
  ) {
    if (!options?.parent) this._blocksData = blocksData;
    const components = this.getComponents(blocksData, options);

    if (!this._config.renderBlock) {
      throw Error(
        `You need to specify a "renderBlock" function in your BlockRenderer config before you can use BlockRenderer.render(...)`
      );
    }
    if (!this._config.combineBlocks) {
      throw Error(
        `You need to specify a "combineBlocks" function in your BlockRenderer config before you can use BlockRenderer.render(...)`
      );
    }

    // Render individual blocks
    const renderedBlocks = components.map((component) =>
      this._config.renderBlock(component, options, this)
    );

    // Combine blocks (allowing for grouping/wrapping)
    let rendered = this._config.combineBlocks(
      renderedBlocks,
      components,
      options,
      this
    );

    // Apply providers if they exist, their conditions are met, and we're rendering blocks at the root level (not nested/inner blocks)
    if (!options?.parent && this._config.providers) {
      rendered = this.applyProviders(rendered, blocksData);
    }

    return rendered;
  }

  private applyProviders(
    content: TRenderOutput | TRenderOutput[],
    blocksData: Partial<TBlockData>[]
  ) {
    return Object.values(this._config.providers).reduceRight(
      (acc, provider) => {
        if (provider.condition({ blocks: blocksData })) {
          return provider.component({ children: acc });
        }
        return acc;
      },
      content
    );
  }

  getConfig(): BlockRendererConfig<
    TComponent,
    TRenderOutput,
    Partial<TBlockData>
  > {
    return this._config;
  }

  /** Get the full array of blocks data that is currently being rendered. */
  getBlocksData(): Partial<TBlockData>[] {
    return this._blocksData;
  }

  /** Get the user-defined meta that you've attached to this BlockRenderer instance. */
  getMeta(key?: string): (null | any) | Record<string, any> {
    if (key) return this._meta[key] ?? null;
    return this._meta;
  }

  /** Attach some user-defined meta to this BlockRenderer instance. */
  setMeta(meta: Record<string, any>) {
    this._meta = deepMerge(this._meta, meta);
  }
}
