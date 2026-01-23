import { Mesh } from "three";

/**
 * A holder for various chunk stuff instead of spilling it here and there
 * Since it was written after column chunk move, it doesnt have cy thing.
 */
export class Chunk {
	cx: number;
	cz: number;
	opaque: Mesh;
}
