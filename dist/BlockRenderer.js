import { deepMerge } from "@kaelan/deep-merge-ts";
import { BlockManifest } from "./BlockManifest.js";
import { discoverBlocks, } from "./discoverBlocks.js";
import { applyNestedBlocks } from "./nestedBlocks.js";
export { discoverBlocks, } from "./discoverBlocks.js";
export { applyNestedBlocks, treesFromNestedBlocks, } from "./nestedBlocks.js";
export class BlockRenderer {
    constructor(config) {
        /** This property holds the full array of blocks data that is currently being rendered. */
        this._blocksData = [];
        this._meta = {};
        this._manifest = new BlockManifest();
        let { blocks, plugins = [], __executionCounts = new Map(), __processedBlocks = new Set(), } = config;
        // if user provides an array of blockConfigs, we take care of deep merging them together before setting the final config:
        if (blocks && Array.isArray(blocks)) {
            const [target, ...sources] = blocks;
            blocks = deepMerge(target, ...sources);
        }
        // Start with base config
        let finalConfig = {
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
    mergeConfigWith(config) {
        const mergedConfig = deepMerge(this._config, config);
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
        return new BlockRenderer(mergedConfig);
    }
    /** This method gets the raw block data array prepared/formatted for rendering. */
    getComponents(blocksData, options) {
        if (!blocksData || !blocksData.length)
            return [];
        const { parent, fromParent, fromAncestors } = options ?? {};
        let blocks = [];
        const config = this.getConfig();
        blocksData.forEach((blockData, i) => {
            const blockId = blockData[config.blockIdField];
            const blockConfig = config.blocks[blockId];
            if (!blockConfig)
                return;
            const context = {
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
            if (!preparedBlock)
                return;
            blocks.push(preparedBlock);
        });
        return blocks;
    }
    /** Given a formatted block data object, this method determines the correct component, runs the block's data router to get the props for that components, and returns both in the format that the `render` function expects.  */
    getComponent(block) {
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
                console.error(`Missing variant config for "${variant}" in the block "${blockId}", so we skip it.`);
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
        let dataRouterProps = filters.dataRouterResult(config.dataRouter?.(block, this) ?? {}, { block, blockRenderer: this });
        const nestedBlocks = ("nestedBlocks" in config ? config.nestedBlocks : undefined) ??
            parentBlockConfig.nestedBlocks;
        if (nestedBlocks?.length) {
            dataRouterProps = applyNestedBlocks(dataRouterProps, block, nestedBlocks, this);
        }
        return {
            Component: config.component,
            props: dataRouterProps,
            block,
        };
    }
    render(blocksData, options) {
        if (!options?.parent) {
            this._blocksData = blocksData;
            this._manifest.resetRendered();
        }
        const components = this.getComponents(blocksData, options);
        if (!this._config.renderBlock) {
            throw Error(`You need to specify a "renderBlock" function in your BlockRenderer config before you can use BlockRenderer.render(...)`);
        }
        if (!this._config.combineBlocks) {
            throw Error(`You need to specify a "combineBlocks" function in your BlockRenderer config before you can use BlockRenderer.render(...)`);
        }
        // Render individual blocks
        const renderedBlocks = components.map((component) => this._config.renderBlock(component, options, this));
        // Combine blocks (allowing for grouping/wrapping)
        let rendered = this._config.combineBlocks(renderedBlocks, components, options, this);
        // Apply providers if they exist, their conditions are met, and we're rendering blocks at the root level (not nested/inner blocks)
        if (!options?.parent && this._config.providers) {
            rendered = this.applyProviders(rendered, blocksData);
        }
        return rendered;
    }
    applyProviders(content, blocksData) {
        return Object.values(this._config.providers).reduceRight((acc, provider) => {
            if (provider.condition({
                blocks: blocksData,
                manifest: this._manifest,
            })) {
                return provider.component({ children: acc });
            }
            return acc;
        }, content);
    }
    getConfig() {
        return this._config;
    }
    /** Get the full array of blocks data that is currently being rendered. */
    getBlocksData() {
        return this._blocksData;
    }
    /** Get the user-defined meta that you've attached to this BlockRenderer instance. */
    getMeta(key) {
        if (key)
            return this._meta[key] ?? null;
        return this._meta;
    }
    /** Attach some user-defined meta to this BlockRenderer instance. */
    setMeta(meta) {
        this._meta = deepMerge(this._meta, meta);
    }
    /**
     * Walk block data and record discovered blocks without running data routers
     * or rendering components. Useful for pre-render module selection.
     */
    discover(blocksData, options) {
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
    getManifest() {
        return this._manifest;
    }
    buildDiscoverRegistry(externalRegistry) {
        const registry = {
            ...(externalRegistry ?? {}),
        };
        const blocks = this.getConfig().blocks;
        if (!blocks || Array.isArray(blocks))
            return registry;
        for (const [blockId, blockConfig] of Object.entries(blocks)) {
            const nestedBlocks = blockConfig.nestedBlocks;
            const variantsRouter = blockConfig.variantsRouter;
            const variants = blockConfig.variants;
            const variantNestedBlocks = variants
                ? Object.fromEntries(Object.entries(variants)
                    .filter(([, variant]) => variant.nestedBlocks?.length)
                    .map(([name, variant]) => [name, variant.nestedBlocks]))
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
