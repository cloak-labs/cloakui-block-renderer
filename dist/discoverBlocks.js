import { BlockManifest } from "./BlockManifest.js";
import { treesFromNestedBlocks } from "./nestedBlocks.js";
const defaultBlockIdField = "name";
export function discoverBlocks(blocksData, options = {}) {
    const { blockIdField = defaultBlockIdField, registry = {}, manifest = new BlockManifest(), } = options;
    manifest.resetDiscovered();
    const walk = (blocks) => {
        if (!blocks?.length)
            return;
        for (const block of blocks) {
            const blockId = block[blockIdField];
            if (!blockId)
                continue;
            manifest.discover(block, blockId);
            const entry = registry[blockId];
            if (!entry)
                continue;
            const variant = entry.variantsRouter?.(block);
            // When a per-variant map exists, omit unlisted variants — do not inherit
            // parent nestedBlocks (e.g. carousel must not walk grid injections).
            const nestedBlocks = entry.variantNestedBlocks && typeof variant === "string"
                ? entry.variantNestedBlocks[variant]
                : entry.nestedBlocks;
            if (!nestedBlocks?.length)
                continue;
            for (const childBlocks of treesFromNestedBlocks(nestedBlocks, block)) {
                walk(childBlocks);
            }
        }
    };
    walk(blocksData);
    return manifest;
}
