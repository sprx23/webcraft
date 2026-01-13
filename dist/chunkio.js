import { s as setCurrentWorld } from './filesystem-BUSnIbmT.js';

/// <reference lib="webworker" />
let world_name = "";
self.onmessage = async (e) => {
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
        self.postMessage({
            chunkCoord: msg.chunk_coord,
            data: data.buffer,
        }, [data.buffer]);
    }
};
