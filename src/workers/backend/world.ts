import {
	BackendMessage,
	BackendMessageType,
	FrontendMessage,
	FrontendMessageType,
	PlayerState,
} from "../../constants";
import { Chunk, IS_COLUMN_CHUNK } from "./chunk";
import { Map3D, CoordinateSet } from "./utils";

/**
 * Notes:
 * px, py, pz -> Player Coords
 * pcx, pcy, pcz -> PLayer Chunk Coords
 * sx, sy, sz -> Spawn Coords
 */
const sq = (x: number) => x * x;
export class World {
	name: string;

	// a lot of constants here are actually fall under PlayerState but unfortunately
	// it was declared too late
	px: number;
	py: number;
	pz: number;
	pcx: number;
	pcy: number;
	pcz: number;
	chunks = new Map3D();
	scheduledLoad = new CoordinateSet(); // chunk coords that are scheduled for load
	scheduledMeshing = new CoordinateSet(); // above but for meshing
	renderXZ: 2; // render distance
	renderY: 2; // mostly useless constant

	/**
	 * Will do later, it is pain
	 * @param name
	 * @param isNew
	 * @param creationStruct
	 */
	constructor(name: string, creationStruct: Map<string, string | number>) {
		this.name = name;
		/*if (isNew) {
			// first find spawn point
			// load 9x5x9 chunks in memory and find good spawn location
			// if fail, go find next spawn
			// if fail > 10 times, spawn player at 0, 100, 0 anyway

			// for testing
			let sx = 0;
			let sy = 100;
			let sz = 0;
		}*/
		((this.px = 0), (this.py = 100), (this.pz = 0)); // should do for now
	}

	chunkLoader() {
		// basically, we will load chunks near player
		// first loading player chunk
		// then closest ones
		// we will unload chunks if they go too far away from player
		// some of them will simply not be rendered
		const [pcx, pcy, pcz] = Chunk.get_chunk_coord(
			this.px,
			this.py,
			this.pz,
		);
		((this.pcx = pcx), (this.pcy = pcy), (this.pcz = pcz));

		// rendering is handled by ui thread
		// my head is boiling, so tolerate this trash code whoever might be extending this in future
		const maxRendered =
			(2 * this.renderXZ + 1) *
			(2 * this.renderXZ + 1) *
			(2 * this.renderY + 1);
		const maxLoaded = Math.floor(maxRendered * 1.5);
		const cxmax = pcx + this.renderXZ;
		const cxmin = pcx - this.renderXZ;
		const cymax = pcy + this.renderY;
		const cymin = pcy - this.renderY;
		const czmax = pcz + this.renderXZ;
		const czmin = pcz - this.renderXZ;

		// first unload chunks if required
		const totalLoadOrInLoad = this.chunks.size; //+ this.scheduledLoad.length // removed bcz idk
		if (totalLoadOrInLoad > maxLoaded) {
			let howManyToRemove = totalLoadOrInLoad - maxLoaded;
			let listOfFarOnes: Chunk[] = [];
			for (const [coord, val] of this.chunks) {
				if (
					coord[0] > cxmax ||
					coord[0] < cxmin ||
					coord[1] > cymax ||
					coord[1] < cymin ||
					coord[2] > czmax ||
					coord[2] < czmin
				) {
					listOfFarOnes.push(val);
				}
			}
			const d2func = (x: Chunk) =>
				sq(x.cx - pcx) + sq(x.cy - pcy) + sq(x.cz - pcz);
			listOfFarOnes = listOfFarOnes.sort((x, y) => d2func(y) - d2func(x));

			// now remove far chunks
			// fuck this
			howManyToRemove = Math.min(howManyToRemove, listOfFarOnes.length);
			for (let i = 0; i < howManyToRemove; i++) {
				// unload shit
				this.unloadChunk(listOfFarOnes[i]);
			}
		}

		// now load shit into toilet i mean this.chunks
		// but first we need to shit those coords in scheduled
		// otherwise it wouldn't be good
		let listOfChunksToLoadOrIDKNotLoad = [];
		for (let i = cxmin; i <= cxmax; ++i) {
			for (let k = czmin; k <= czmax; ++k) {
				if (IS_COLUMN_CHUNK) {
					listOfChunksToLoadOrIDKNotLoad.push([i, 0, k]);
				} else for (let j = cymin; j <= cymax; ++j) {
					listOfChunksToLoadOrIDKNotLoad.push([i, j, k]);
				}
			}
		}

		const d2func = (x: Chunk) =>
			sq(x.cx - pcx) + sq(x.cy - pcy) + sq(x.cz - pcz);
		// basically put closer chunks first
		listOfChunksToLoadOrIDKNotLoad = listOfChunksToLoadOrIDKNotLoad.sort(
			(x, y) => d2func(x) - d2func(y),
		);
		for (const coord of listOfChunksToLoadOrIDKNotLoad) {
			if (!(this.chunks.has(coord) || this.scheduledLoad.has(coord))) {
				this.scheduledLoad.add(coord);
			}
		}
	}

	unloadChunk(c: Chunk) { }

	handleFrontendMessage(e: MessageEvent<FrontendMessage>) {
		const msg = e.data;

		if (msg.type === FrontendMessageType.SCHEDULE_CHUNK_MESHING) {
			for (const coord of msg.chunk_coords)
				this.scheduledMeshing.add(coord);
		}

		if (msg.type === FrontendMessageType.CANCEL_CHUNK_MESHING) {
			for (const coord of msg.chunk_coords)
				this.scheduledMeshing.delete(coord);
		}

		if (msg.type === FrontendMessageType.SYNC_PLAYER_STATE) {
			this.syncPlayerState(msg.playerState);
		}
	}

	/**
	 * How this works is simple
	 * Validate player actvity (movements) using collision and gravity
	 * And DONT Return updated player state
	 * Message that state back to ui thread
	 *
	 * Anti Cheat ppl should know this is place to put anti cheat stuff
	 */
	syncPlayerState(state?: PlayerState) {
		// send like this
		// this.messageBack({ type: BackendMessageType.SYNC_PLAYER_STATE });
	}

	messageBack(msg: BackendMessage, transfer?: ArrayBuffer[]) {
		self.postMessage(msg, transfer);
	}

	sendDebugMessage(text: string) {
		this.messageBack({
			type: BackendMessageType.DEBUG_MSG,
			text,
		});
	}

	/**
	 * This thing does meshing and returns number of chunks actually meshed
	 */
	meshingTask(maxMeshingAllowed: number) { }

	/**
	 * Very Very Important Method
	 */
	tick() { }
}
