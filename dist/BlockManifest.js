export class BlockManifest {
    constructor() {
        this._discovered = [];
        this._rendered = [];
        this._discoveredNames = new Set();
        this._renderedNames = new Set();
    }
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
    discover(block, blockId) {
        if (!blockId)
            return;
        this._discoveredNames.add(blockId);
        this._discovered.push(this.toRecord(block, blockId));
    }
    recordRender(block, blockId) {
        if (!blockId)
            return;
        this._renderedNames.add(blockId);
        this._rendered.push(this.toRecord(block, blockId));
    }
    toRecord(block, blockId) {
        const data = block.data;
        return {
            name: blockId,
            ...(data !== undefined ? { data } : {}),
            block,
        };
    }
    get discovered() {
        return this._discovered;
    }
    get rendered() {
        return this._rendered;
    }
    get discoveredNames() {
        return this._discoveredNames;
    }
    get renderedNames() {
        return this._renderedNames;
    }
    didDiscover(name) {
        return this._discoveredNames.has(name);
    }
    didRender(name) {
        return this._renderedNames.has(name);
    }
    didDiscoverWhere(name, predicate) {
        return this._discovered.some((record) => record.name === name && predicate(record));
    }
    didRenderWhere(name, predicate) {
        return this._rendered.some((record) => record.name === name && predicate(record));
    }
}
