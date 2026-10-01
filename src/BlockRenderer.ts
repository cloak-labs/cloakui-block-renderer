import type {
  BlockRendererConfig,
  BlockContext,
  BlockDataWithExtraContext,
  ComponentLike,
  RenderPreparedBlock,
  EmptyObjectOrRecord,
  RenderOptions,
} from "./types.js";
import { deepMerge } from "@kaelan/deep-merge-ts";
import { DeepPartial } from "ts-essentials";
import { BlockManifest } from "./BlockManifest.js";
import {
  discoverBlocks,
  type DiscoverBlocksOptions,
  type DiscoverRegistryEntry,
} from "./discoverBlocks.js";
import { applyNestedBlocks, type NestedBlocksBinding } from "./nestedBlocks.js";

export type { BlockManifest, BlockManifestRecord } from "./BlockManifest.js";
export {
  discoverBlocks,
  type DiscoverBlocksOptions,
  type DiscoverRegistryEntry,
} from "./discoverBlocks.js";
export {
  applyNestedBlocks,
  treesFromNestedBlocks,
  type NestedBlocksBinding,
  type NestedTree,
} from "./nestedBlocks.js";

export class BlockRenderer<
  TComponent extends ComponentLike = ComponentLike,
  TRenderOutput = any,
  TBlockData extends Record<string, any> = Record<string, any>,
> {
  protected _config: BlockRendererConfig<
    TComponent,
    TRenderOutput,
    Partial<TBlockData>
  >;

  /** This property holds the full array of blocks data that is currently being rendered. */
  protected _blocksData: Partial<TBlockData>[] = [];
  protected _meta: Record<string, any> = {};
  protected _manifest = new BlockManifest<TBlockData>();

  constructor(
    config: BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>,
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
          nestedRenderOptions: (value) => value,
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
    >,
  ) {
    const mergedConfig = deepMerge<
      BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>,
      DeepPartial<
        BlockRendererConfig<TComponent, TRenderOutput, Partial<TBlockData>>
      >[]
    >(this._config, config);

    // deepMerge keeps Set/Map by reference. Clone so plugin bookkeeping on a
    // singleton base renderer (e.g. kit coreRenderer) isn't mutated when
    // createPageBlockRenderer repeatedly mergeConfigWith()'s lazy block configs —
    // otherwise processedBlocks skips container defaults on later requests.
    if (mergedConfig.__processedBlocks instanceof Set) {
      mergedConfig.__processedBlocks = new Set(mergedConfig.__processedBlocks);
    }
    if (mergedConfig.__executionCounts instanceof Map) {
      mergedConfig.__executionCounts = new Map(mergedConfig.__executionCounts);
    }

    return new BlockRenderer<TComponent, TRenderOutput, Partial<TBlockData>>(
      mergedConfig,
    );
  }

  /** This method gets the raw block data array prepared/formatted for rendering. */
  getComponents(
    blocksData: Partial<TBlockData>[],
    options?: RenderOptions<TBlockData>,
  ): RenderPreparedBlock<
    TComponent,
    EmptyObjectOrRecord,
    Partial<TBlockData>
  >[] {
    if (!blocksData || !blocksData.length) return [];
    const { parent, fromParent, fromAncestors } = options ?? {};

    let blocks = [];
    const config = this.getConfig();

    blocksData.forEach((blockData, i) => {
      const blockId = blockData[config.blockIdField];
      const blockConfig = config.blocks[blockId];

      if (!blockConfig) return;

      const context: BlockContext<Partial<TBlockData>> = {
        fromParent,
        parent,
        index: i,
        prevSibling: i > 0 ? blocksData[i - 1] : null,
        nextSibling: i < blocksData.length - 1 ? blocksData[i + 1] : null,
        fromAncestors,
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
    block: BlockDataWithExtraContext<Partial<TBlockData>>,
  ): RenderPreparedBlock<TComponent, TProps, Partial<TBlockData>> {
    const blockId = block[this._config.blockIdField];

    let config = this._config.blocks[blockId];
    if (!config) {
      // no luck, log error to console and return early:
      console.error(`Missing config for block "${blockId}", so we skip it.`);
      return;
    }

    const parentBlockConfig = config;

    // if the block has variants, we need to determine which one to use:
    if (config.variantsRouter) {
      const variant = config.variantsRouter?.(block);
      config = config.variants[variant];
      if (!config) {
        console.error(
          `Missing variant config for "${variant}" in the block "${blockId}", so we skip it.`,
        );
        return;
      }
    }

    if (!config.component) {
      console.error(`Missing component for block "${blockId}", so we skip it.`);
      return;
    }

    this._manifest.recordRender(block, blockId);

    const { filters } = this._config.hooks;

    // call the block's dataRouter to receive its props
    let dataRouterProps = filters.dataRouterResult(
      config.dataRouter?.(block, this) ?? {},
      { block, blockRenderer: this },
    );

    const nestedBlocks =
      ("nestedBlocks" in config ? config.nestedBlocks : undefined) ??
      parentBlockConfig.nestedBlocks;

    if (nestedBlocks?.length) {
      dataRouterProps = applyNestedBlocks(
        dataRouterProps,
        block,
        nestedBlocks,
        this,
      );
    }

    return {
      Component: config.component,
      props: dataRouterProps as TProps,
      block,
    };
  }

  render(
    blocksData: Partial<TBlockData>[],
    options?: RenderOptions<TBlockData>,
  ) {
    if (!options?.parent) {
      this._blocksData = blocksData;
      this._manifest.resetRendered();
    }
    const components = this.getComponents(blocksData, options);

    if (!this._config.renderBlock) {
      throw Error(
        `You need to specify a "renderBlock" function in your BlockRenderer config before you can use BlockRenderer.render(...)`,
      );
    }
    if (!this._config.combineBlocks) {
      throw Error(
        `You need to specify a "combineBlocks" function in your BlockRenderer config before you can use BlockRenderer.render(...)`,
      );
    }

    // Render individual blocks
    const renderedBlocks = components.map((component) =>
      this._config.renderBlock(component, options, this),
    );

    // Combine blocks (allowing for grouping/wrapping)
    let rendered = this._config.combineBlocks(
      renderedBlocks,
      components,
      options,
      this,
    );

    // Apply providers if they exist, their conditions are met, and we're rendering blocks at the root level (not nested/inner blocks)
    if (!options?.parent && this._config.providers) {
      rendered = this.applyProviders(rendered, blocksData);
    }

    return rendered;
  }

  private applyProviders(
    content: TRenderOutput | TRenderOutput[],
    blocksData: Partial<TBlockData>[],
  ) {
    return Object.values(this._config.providers).reduceRight(
      (acc, provider) => {
        if (
          provider.condition({
            blocks: blocksData,
            manifest: this._manifest,
          })
        ) {
          return provider.component({ children: acc });
        }
        return acc;
      },
      content,
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

  /**
   * Walk block data and record discovered blocks without running data routers
   * or rendering components. Useful for pre-render module selection.
   */
  discover(
    blocksData: Partial<TBlockData>[] | undefined | null,
    options?: Omit<
      DiscoverBlocksOptions<TBlockData>,
      "manifest" | "blockIdField"
    >,
  ): BlockManifest<TBlockData> {
    const config = this.getConfig();
    const registry = this.buildDiscoverRegistry(options?.registry);

    return discoverBlocks(blocksData, {
      ...options,
      blockIdField: config.blockIdField,
      registry,
      manifest: this._manifest,
    });
  }

  /** Blocks recorded during the most recent root-level `render()` call. */
  getManifest(): BlockManifest<TBlockData> {
    return this._manifest;
  }

  private buildDiscoverRegistry(
    externalRegistry?: Record<string, DiscoverRegistryEntry<TBlockData>>,
  ): Record<string, DiscoverRegistryEntry<TBlockData>> {
    const registry: Record<string, DiscoverRegistryEntry<TBlockData>> = {
      ...(externalRegistry ?? {}),
    };
    const blocks = this.getConfig().blocks;

    if (!blocks || Array.isArray(blocks)) return registry;

    for (const [blockId, blockConfig] of Object.entries(blocks)) {
      const nestedBlocks = (
        blockConfig as {
          nestedBlocks?: NestedBlocksBinding<TBlockData>[];
        }
      ).nestedBlocks;
      const variantsRouter = (
        blockConfig as {
          variantsRouter?: (
            block: BlockDataWithExtraContext<Partial<TBlockData>>,
          ) => string;
        }
      ).variantsRouter;
      const variants = (
        blockConfig as {
          variants?: Record<
            string,
            { nestedBlocks?: NestedBlocksBinding<TBlockData>[] }
          >;
        }
      ).variants;

      const variantNestedBlocks = variants
        ? Object.fromEntries(
            Object.entries(variants)
              .filter(([, variant]) => variant.nestedBlocks?.length)
              .map(([name, variant]) => [name, variant.nestedBlocks!]),
          )
        : undefined;

      registry[blockId] = {
        ...registry[blockId],
        ...(nestedBlocks?.length ? { nestedBlocks } : {}),
        ...(variantNestedBlocks && Object.keys(variantNestedBlocks).length
          ? { variantNestedBlocks }
          : {}),
        ...(variantsRouter ? { variantsRouter } : {}),
      };
    }

    return registry;
  }
}
