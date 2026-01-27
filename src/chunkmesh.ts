import { Mesh, Scene } from "three";

/**
 * A holder for various chunk stuff instead of spilling it here and there
 */
export class ChunkMesh {
	opaque: Mesh;

	/**
	 * Please add whatever mesh clean up code here
	 * If you add more meshes
	 */
	dispose(scene: Scene) {
		this.opaque.geometry.dispose();
		// @ts-ignore
		this.opaque.material.dispose();
		scene.remove(this.opaque);
	}
}
