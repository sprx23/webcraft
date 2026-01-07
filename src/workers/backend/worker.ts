import { readFile, readFileStr } from "./filesystem"

type Message = Record<string, any>

self.onmessage = async (e: Message) => {
    if (e.type === 'load_world') {
        const worldName = e.worldName
        const list = (await readFileStr("worlds.txt")).split("\n")
        const isNew = list.includes(worldName)

    }
}