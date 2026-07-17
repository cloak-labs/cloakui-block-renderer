import type { BlockDataWithExtraContext, ComponentLike } from "./types.js";
import type { BlockRenderer } from "./BlockRenderer.js";

export type NestedTree<
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  blocks: Partial<TBlockData>[];
  meta?: Record<string, unknown>;
};

export type NestedBlocksBinding<
  TBlockData extends Record<string, any> = Record<string, any>,
  TRenderOutput = unknown,
> = {
  /** Child trees — also used for discovery (walk only; never attach/render). */
  trees: (block: Partial<TBlockData>) => NestedTree<TBlockData>[];

  /**
   * Options passed into renderer.render() for these trees.
   * `parent` is always the current block; this adds customProps etc.
   */
  renderOptions?: (
    block: Partial<TBlockData>,
    props: Record<string, any>,
  ) => { customProps?: Record<string, any> };

  /** Merge rendered outputs into data-router props. */
  attach: (
    props: Record<string, any>,
    rendered: {
      output: TRenderOutput | TRenderOutput[];
      meta?: Record<string, unknown>;
    }[],
  ) => void | Record<string, any>;
};

/** Extract child block trees from nestedBlocks bindings (discovery). */
export function treesFromNestedBlocks<
  TBlockData extends Record<string, any> = Record<string, any>,
>(
  bindings: NestedBlocksBinding<TBlockData>[] | undefined,
  block: Partial<TBlockData>,
): Partial<TBlockData>[][] {
  if (!bindings?.length) return [];

  return bindings.flatMap((binding) =>
    binding.trees(block).map((tree) => tree.blocks),
  );
}

export function applyNestedBlocks<
  TComponent extends ComponentLike = ComponentLike,
  TRenderOutput = any,
  TBlockData extends Record<string, any> = Record<string, any>,
>(
  props: Record<string, any>,
  block: BlockDataWithExtraContext<Partial<TBlockData>>,
  bindings: NestedBlocksBinding<TBlockData, TRenderOutput>[] | undefined,
  renderer: BlockRenderer<TComponent, TRenderOutput, TBlockData>,
): Record<string, any> {
  if (!bindings?.length) return props;

  let nextProps = props;

  for (const binding of bindings) {
    const trees = binding.trees(block);
    if (!trees.length) continue;

    const opts = binding.renderOptions?.(block, nextProps) ?? {};
    const rendered = trees.map(({ blocks, meta }) => ({
      output: renderer.render(blocks, { parent: block, ...opts }),
      meta,
    }));

    const attached = binding.attach(nextProps, rendered);
    if (attached) nextProps = attached;
  }

  return nextProps;
}
