import { BackendMessageType, ChunkIOMessageType, ChunkIOReply } from "../../constants";
import { FirstInLastOutArray, CoordinateSet } from "./utils";
import { World } from "./world";
import { Chunk } from "./chunk";
import { coordAdd } from "../../utils";

export class GameLoop {
	private readonly TPS = 20;
	private readonly MS_PER_TICK = 1000 / this.TPS;

	private tpsTimestamps = new FirstInLastOutArray<number>(this.TPS);
	private tickTimeLog = new FirstInLastOutArray<number>(this.TPS);
	private meshingTimeLog = new FirstInLastOutArray<number>(this.TPS);

	private avgTickMS = 1;
	private avgMeshingMS = 1;
	private currentTPS = this.TPS;

	private world: World = null;
	chunkio: MessagePort = null;

	constructor(chunkio: MessagePort) {
		this.tpsTimestamps.fill(0);
		this.tickTimeLog.fill(0);
		this.meshingTimeLog.fill(0);

		this.chunkio = chunkio;
		this.chunkio.onmessage = (e: MessageEvent<ChunkIOReply>) => this.onChunkDataArrival(e.data);
	}

	start(world: World) {
		this.world = world;
		this.loop();
	}

	loop() {
		const tickStart = performance.now();
		this.tick();
		const tickEnd = performance.now();

		const tickMS = tickEnd - tickStart;
		this.tickTimeLog.push(tickMS);
		this.tpsTimestamps.push(tickEnd);

		const meshStart = performance.now();
		let maxMesh = (this.MS_PER_TICK - tickMS) / this.avgMeshingMS;
		if (maxMesh < 1) maxMesh = 1;
		this.meshingTask(maxMesh);
		const meshEnd = performance.now();

		const meshMS = meshEnd - meshStart;
		this.meshingTimeLog.push(meshMS / maxMesh);

		this.avgTickMS =
			this.tickTimeLog.getArray().reduce((a, b) => a + b) / this.TPS;
		this.avgMeshingMS =
			this.meshingTimeLog.getArray().reduce((a, b) => a + b) / this.TPS;
		this.currentTPS = this.tpsTimestamps
			.getArray()
			.filter((t) => meshEnd - t < 1000).length;

		const wait = Math.max(0, this.MS_PER_TICK - tickMS - meshMS - 1);
		setTimeout(() => this.loop(), wait);
	}

	tick() {
		if (!this.world) return;

		this.world.chunkLoader();
		for (const ccoord of this.world.scheduledLoad) {
			this.chunkio.postMessage({
				world_name: this.world.name,
				type: ChunkIOMessageType.LOAD_CHUNK,
				chunk_coord: ccoord
			});
			this.world.scheduledLoad.delete(ccoord);
		}
	}

	/**
	 * @param maxMeshingAllowed  max permisble number of chunks that can be processed
	 * @returns number of chunks process
	 */
	meshingTask(maxMeshingAllowed: number): number {
		// so basically do that number of chunks for meshing
		// we will skip those that cannot be processed due to
		// slow chunk generation/not generated neighbours and 
		// leave them for next turn

		let actually_meshed = 0;
		let i = 0;

		while (actually_meshed < maxMeshingAllowed && i < this.world.scheduledMeshing.length) {
			i++;
			const coord = this.world.scheduledMeshing[i];
			const chunk = this.world.chunks.get(coord);

			const coord_top = coordAdd(coord, [0, 1, 0]);
			const coord_bottom = coordAdd(coord, [0, -1, 0]);
			const coord_left = coordAdd(coord, [1, 0, 0]);
			const coord_right = coordAdd(coord, [-1, 0, 0]);
			const coord_front = coordAdd(coord, [0, 0, 1]);
			const coord_back = coordAdd(coord, [0, 0, -1]);

			// we will get neighbour chunk or check if it is scheduled
			// if not scheduled, we will proceed with meshing anyway
			// it will be assumed that chunk is fully opaque blocks
			const top = this.world.chunks.get(coord_top);
			const bottom = this.world.chunks.get(coord_bottom);
			const left = this.world.chunks.get(coord_left);
			const right = this.world.chunks.get(coord_right);
			const front = this.world.chunks.get(coord_front);
			const back = this.world.chunks.get(coord_back);

			if (
				!chunk ||
				!top && !this.world.scheduledLoad.has(coord_top) ||
				!bottom && !this.world.scheduledLoad.has(coord_bottom) ||
				!left && !this.world.scheduledLoad.has(coord_left) ||
				!right && !this.world.scheduledLoad.has(coord_right) ||
				!front && !this.world.scheduledLoad.has(coord_front) ||
				!back && !this.world.scheduledLoad.has(coord_back)
			) {
				// this is just for memory safety
				// we don't want to bloat memory
				// chunks that got scheduled by frontend but are never scheduled
				// by backed will never be processed, so just drop them
				if (!this.world.scheduledLoad.has(coord)) {
					this.world.scheduledMeshing[i] = null;
				}
				continue;
			}

			// TODO: update Chunk.mesh to handle null chunks as obaque
			const data = Chunk.mesh(chunk, top, bottom, left, right, front, back);
			this.world.messageBack({
				type: BackendMessageType.MESH_DATA_ARRIVAL,
				rawChunkMesh: data
			}, [data.i, data.n, data.p, data.u]);

			this.world.scheduledMeshing[i] = null;
			actually_meshed++;
		}

		this.world.scheduledMeshing = this.world.scheduledMeshing.filter(ccoord => !!ccoord);
		return actually_meshed;
	}

	onChunkDataArrival(reply: ChunkIOReply) {
		// so read coord and put it inside world
		if (reply.success) {
			// I have written it like this for a reason
			const chunk = new Chunk(
				reply.data,
				reply.chunk_coord[0],
				reply.chunk_coord[1],
				reply.chunk_coord[2],
			);
			this.world.chunks.set(reply.chunk_coord, chunk);
		} else {
			this.world?.sendDebugMessage(
				"Failed to load chunk for reasons. Check console.",
			);
		}
	}
}
