import { readFile, readFileStr } from "./filesystem"

type Message = Record<string, any>

self.onmessage = async (e: MessageEvent<Message>) => {
    const msg = e.data
    
    if (msg.type === 'load_world') {
        const worldName = msg.worldName
        const list = (await readFileStr("worlds.txt")).split("\n")
        const isNew = list.includes(worldName)

    }
    
    
}