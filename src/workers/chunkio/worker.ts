import {
    writeWorldFile,
    readWorldFileStr,
    readWorldFile,
    setCurrentWorld,
} from "./../backend/filesystem";

type ChunkIOMessage = {
    chunk_coord: number[];
    action: "retrive" | "save";
    data?: Uint16Array;
    world_name: string;
};

const REGION_SIZE = 16;
/**
 * Data that is saved in world.json file
 * world.json file contains data such as world settings, generator settings
 * and how block int_ids are related to different blocks from different mods
 *
 * If mods are removed, all its blocks turn to air upon conversion in retrival
 * However in above, some ids may be changed for other mods
 * If mods are added, nothing is done
 *
 * Attention! ChunkIO worker never modifies this file!
 * It must be modified by mod manager in ui thread
 */
type WorldJSON = {
    name: string;
    generation_settings: Map<string, string | number>;
    block_table: string[][]; // 2D, first dim is version and
    // second dim is position (index) <-> block str id assoc
    mods: Map<string, Mod>; // mod ids and their instance
};

type Mod = {
    id: string; // must be same as key storing this object
    blocks: string[]; // block str id list
};

let world_name = "";
let world_json: WorldJSON = null;

self.onmessage = async (e: MessageEvent<ChunkIOMessage>) => {
    const msg = e.data;
    if (world_name != msg.world_name) {
        world_name = msg.world_name;
        setCurrentWorld(msg.world_name);
        //world_json = JSON.parse(await readWorldFileStr("world.json"));
    }

    /**
     * Current Format of chunk files follow following storage format
     * [HEADER]
     * uint16 version that is related to WorldJSON.block_table
     * uint16 record count
     *
     * [RECORD]
     * uint32 chunk location in file
     * uint16 cx kinda bad that max world size is 20 mil cube but should be fine for now
     * uint16 cy
     * uint16 cz
     *
     * [CHUNK]
     * lz4 compression uint16 stream (8Kb per chunk decompresed)
     *
     * For storing, every chunk has a region assosicated with it
     * Region
     */
    if (msg.action == "retrive") {
        const data = new Uint16Array(16 * 16 * 16);
        for (let i = 0; i < 256; i++) {
            data[i] = 1;
        }
        self.postMessage(
            {
                chunkCoord: msg.chunk_coord,
                data: data.buffer,
            },
            [data.buffer],
        );
    }
};
