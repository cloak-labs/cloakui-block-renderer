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
        const baseOptions = {
            parent: block,
            ...opts,
        };
        const filter = renderer.getConfig().hooks?.filters?.nestedRenderOptions;
        const renderOptions = filter
            ? filter(baseOptions, { parent: block, props: nextProps })
            : baseOptions;
        const rendered = trees.map(({ blocks, meta }) => ({
            output: renderer.render(blocks, renderOptions),
            meta,
        }));
        const attached = binding.attach(nextProps, rendered);
        if (attached)
            nextProps = attached;
    }
    return nextProps;
}
