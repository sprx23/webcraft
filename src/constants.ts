/**
 * This files must exculsively store only CONSTANTS
 * and types that are shared across different parts of
 * code that run on differnt threads
 */

// chunk related
export const CHUNK_SIZE = 16;
export const REGION_SIZE = 16;
export const TEXTURE_SIZE = 16; // must be applied for all blocks
export const MAX_TEXTURE_ATLAS_SIZE = 4096;

// chat
export const MAX_CHAT_LINES = 50;

// controls
export const SENSITIVITY = 0.002;

// type def
export type BackendMessage = {
	type: BackendMessageType;
	text?: string;
	data?: Uint16Array;
	playerState?: PlayerState;

	senderModId?: string;
	recieverModId?: string;
	modMsg?: any;

	// look in mesh() method of backend/chunk.ts
	// for meaning of this stuff
	u?: ArrayBuffer;
	n?: ArrayBuffer;
	i?: ArrayBuffer;
	p?: ArrayBuffer;
	t?: number;
};

export enum BackendMessageType {
	DEBUG_MSG,
	MESH_DATA_ARRIVAL,
	LOADING_COMPLETE,
	SYNC_PLAYER_STATE,
	MOD_COMM,
}

export type FrontendMessage = {
	type: FrontendMessageType;
	world_name?: string;
	chunk_coord?: [number, number, number];
	chunk_coords?: [number, number, number][];
	playerState?: PlayerState;
	creationStruct?: Map<string, string | number>;

	senderModId?: string;
	recieverModId?: string;
	modMsg?: any;
};

export enum FrontendMessageType {
	SCHEDULE_CHUNK_MESHING,
	CANCEL_CHUNK_MESHING,
	INIT_WORLD,
	SYNC_PLAYER_STATE,
	MOD_COMM,
}

export type ChunkIOMessage = {
	chunk_coord?: [number, number, number];
	chunk_coords?: [number, number, number][];
	action: "retrive" | "save";
	data?: Uint16Array;
	world_name: string;
};
export type ChunkIOReply = {
	chunk_coord: [number, number, number];
	data?: Uint16Array;
	success: boolean;
};

// I guess we will not have any player class
// but just a state
// it needs to be passed between threads
export type PlayerState = {
	px: number;
	py: number;
	pz: number;
	pcx: number;
	pcy: number;
	pcz: number;
	renderXZ: number;
	renderY: number;
};
