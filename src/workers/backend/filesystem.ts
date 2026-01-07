import {get, keys, set, del } from "idb-keyval"

let world = ""
export function setCurrentWorld(world_: string) {
    world = world_
}

export function writeFile(path: string, ab: ArrayBuffer | string) {
    if (typeof ab === "string") {
        ab = str2u8(ab).buffer
    }
    return set(path, ab)
}

export function readFile(path: string) {
    return get(path)
}

export async function readFileStr(path: string) {
    return ab2str(await get(path))
}

export function readWorldFile(path: string) {
    return get(world + "/" + path)
}

export async function readWorldFileStr(path: string) {
    return ab2str(await get(world + "/" + path))
}

export function writeWorldFile(path: string, ab: ArrayBuffer) {
    if (typeof ab === "string") {
        ab = str2u8(ab).buffer
    }
    return set(world + "/" + path, ab)    
}

export function ab2str(ab: ArrayBuffer) {
    return new TextDecoder().decode(ab)
}

export function str2u8(str: string) {
    return new TextEncoder().encode(str)
}