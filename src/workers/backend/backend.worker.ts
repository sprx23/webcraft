import { FrontendMessage, FrontendMessageType } from "../../constants";
import { readFile, readFileStr } from "./filesystem";
import { World } from "./world";

let world: World = null;
self.onmessage = async (e: MessageEvent<FrontendMessage>) => {
	const msg = e.data;

	if (msg.type === FrontendMessageType.INIT_WORLD) {
		const worldName = msg.world_name;
		const list = (await readFileStr("worlds.txt")).split("\n");
		const isNew = list.includes(worldName);
		// do something to create world idk what

		world = new World(worldName, isNew, msg.creationStruct);
	}

	if (world) world.handleFrontendMessage(e);
};
