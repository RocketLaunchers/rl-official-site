declare module 'occt-import-js' {
  export interface OcctArray {
    array: number[];
  }
  export interface OcctMesh {
    name?: string;
    color?: [number, number, number];
    attributes: { position: OcctArray; normal?: OcctArray };
    index: OcctArray;
  }
  export interface OcctReadResult {
    success: boolean;
    meshes: OcctMesh[];
  }
  export interface Occt {
    ReadStepFile(content: Uint8Array, params: unknown): OcctReadResult;
  }
  const factory: (opts?: { locateFile?: (path: string) => string }) => Promise<Occt>;
  export default factory;
}
