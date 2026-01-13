import { r as readFileStr } from './filesystem-BUSnIbmT.js';

self.onmessage = async (e) => {
    const msg = e.data;
    if (msg.type === 'load_world') {
        const worldName = msg.worldName;
        const list = (await readFileStr("worlds.txt")).split("\n");
        list.includes(worldName);
    }
};
