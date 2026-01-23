import { ChunkIOReply } from "../../constants";
import { FirstInLastOutArray, CoordinateSet } from "./utils";
import { World } from "./world";

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
	private chunkio = new Worker("../dist/chunkio.js");
	private scheduledForMesh = new CoordinateSet();

	constructor() {
		this.tpsTimestamps.fill(0);
		this.tickTimeLog.fill(0);
		this.meshingTimeLog.fill(0);

		this.chunkio.addEventListener(
			"message",
			(e: MessageEvent<ChunkIOReply>) => {},
		);
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
		setTimeout(this.loop, wait);
	}

	gameTick() {
		if (!this.world) return;
		for (const ccoord of this.world.scheduledLoad) {
			// schedule load
		}
	}

	meshingTask(maxMeshingAllowed: number) {
		// meshing logic
	}

	onChunk;
}
