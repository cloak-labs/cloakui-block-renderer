export type BlockManifestRecord<
  TBlockData extends Record<string, any> = Record<string, any>,
> = {
  name: string;
  data?: Record<string, unknown>;
  block: Partial<TBlockData>;
};

export class BlockManifest<
  TBlockData extends Record<string, any> = Record<string, any>,
> {
  private _discovered: BlockManifestRecord<TBlockData>[] = [];
  private _rendered: BlockManifestRecord<TBlockData>[] = [];
  private _discoveredNames = new Set<string>();
  private _renderedNames = new Set<string>();

  resetDiscovered() {
    this._discovered = [];
    this._discoveredNames = new Set();
  }

  resetRendered() {
    this._rendered = [];
    this._renderedNames = new Set();
  }

  reset() {
    this.resetDiscovered();
    this.resetRendered();
  }

  discover(block: Partial<TBlockData>, blockId: string) {
    if (!blockId) return;

    this._discoveredNames.add(blockId);
    this._discovered.push(this.toRecord(block, blockId));
  }

  recordRender(block: Partial<TBlockData>, blockId: string) {
    if (!blockId) return;

    this._renderedNames.add(blockId);
    this._rendered.push(this.toRecord(block, blockId));
  }

  private toRecord(
    block: Partial<TBlockData>,
    blockId: string,
  ): BlockManifestRecord<TBlockData> {
    const data = (block as { data?: Record<string, unknown> }).data;

    return {
      name: blockId,
      ...(data !== undefined ? { data } : {}),
      block,
    };
  }

  get discovered(): ReadonlyArray<BlockManifestRecord<TBlockData>> {
    return this._discovered;
  }

  get rendered(): ReadonlyArray<BlockManifestRecord<TBlockData>> {
    return this._rendered;
  }

  get discoveredNames(): ReadonlySet<string> {
    return this._discoveredNames;
  }

  get renderedNames(): ReadonlySet<string> {
    return this._renderedNames;
  }

  didDiscover(name: string): boolean {
    return this._discoveredNames.has(name);
  }

  didRender(name: string): boolean {
    return this._renderedNames.has(name);
  }

  didDiscoverWhere(
    name: string,
    predicate: (record: BlockManifestRecord<TBlockData>) => boolean,
  ): boolean {
    return this._discovered.some(
      (record) => record.name === name && predicate(record),
    );
  }

  didRenderWhere(
    name: string,
    predicate: (record: BlockManifestRecord<TBlockData>) => boolean,
  ): boolean {
    return this._rendered.some(
      (record) => record.name === name && predicate(record),
    );
  }
}
