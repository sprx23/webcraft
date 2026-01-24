import { ChunkIOMessageType, ChunkIOReply } from "../../constants";
import { FirstInLastOutArray, CoordinateSet } from "./utils";
import { World } from "./world";
import { Chunk } from "./chunk";

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
	private scheduledForMesh = new CoordinateSet();
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
		this.gameTick();
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

	gameTick() {
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

	meshingTask(maxMeshingAllowed: number) {
		// meshing logic
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
