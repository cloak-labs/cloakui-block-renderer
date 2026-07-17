export type BlockManifestRecord<TBlockData extends Record<string, any> = Record<string, any>> = {
    name: string;
    data?: Record<string, unknown>;
    block: Partial<TBlockData>;
};
export declare class BlockManifest<TBlockData extends Record<string, any> = Record<string, any>> {
    private _discovered;
    private _rendered;
    private _discoveredNames;
    private _renderedNames;
    resetDiscovered(): void;
    resetRendered(): void;
    reset(): void;
    discover(block: Partial<TBlockData>, blockId: string): void;
    recordRender(block: Partial<TBlockData>, blockId: string): void;
    private toRecord;
    get discovered(): ReadonlyArray<BlockManifestRecord<TBlockData>>;
    get rendered(): ReadonlyArray<BlockManifestRecord<TBlockData>>;
    get discoveredNames(): ReadonlySet<string>;
    get renderedNames(): ReadonlySet<string>;
    didDiscover(name: string): boolean;
    didRender(name: string): boolean;
    didDiscoverWhere(name: string, predicate: (record: BlockManifestRecord<TBlockData>) => boolean): boolean;
    didRenderWhere(name: string, predicate: (record: BlockManifestRecord<TBlockData>) => boolean): boolean;
}
//# sourceMappingURL=BlockManifest.d.ts.map