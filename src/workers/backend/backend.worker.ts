import { FrontendMessage, FrontendMessageType } from "../../constants";
import { GameLoop } from "./gameloop";
import { World } from "./world";

let world: World = null;
let chunkio: MessagePort;
self.onmessage = async (e: MessageEvent<FrontendMessage>) => {
	const msg = e.data;

	if (msg.type === FrontendMessageType.INIT_WORLD) {
		const worldName = msg.world_name;
		world = new World(worldName, msg.creationStruct);
		console.log("INIT_WORLD", msg.world_name, "done successfully.");

		// now start the loop
		if (!chunkio) throw new Error("ChunkIO thread message port is not initialized. Please send that message port first!");
		const loop = new GameLoop(chunkio);
		loop.start(world);
	}

	if (msg.type === FrontendMessageType.SET_CHUNKIO_THREAD_MSGPORT) {
		chunkio = e.ports[0];
	}

	if (world) world.handleFrontendMessage(e);
};
