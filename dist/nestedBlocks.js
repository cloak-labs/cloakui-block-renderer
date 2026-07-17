/** Extract child block trees from nestedBlocks bindings (discovery). */
export function treesFromNestedBlocks(bindings, block) {
    if (!bindings?.length)
        return [];
    return bindings.flatMap((binding) => binding.trees(block).map((tree) => tree.blocks));
}
export function applyNestedBlocks(props, block, bindings, renderer) {
    if (!bindings?.length)
        return props;
    let nextProps = props;
    for (const binding of bindings) {
        const trees = binding.trees(block);
        if (!trees.length)
            continue;
        const opts = binding.renderOptions?.(block, nextProps) ?? {};
        const rendered = trees.map(({ blocks, meta }) => ({
            output: renderer.render(blocks, { parent: block, ...opts }),
            meta,
        }));
        const attached = binding.attach(nextProps, rendered);
        if (attached)
            nextProps = attached;
    }
    return nextProps;
}
