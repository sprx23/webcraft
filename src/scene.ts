let scene_data: Map<string, any> = new Map()
const scene_map: Map<string, Scene> = new Map()

export type Scene = {
    handler: SceneHandler,
    type: string
}
export type SceneHandler = (old_data: Map<string, any>, cur_data: Map<string, any>) => void

export function registerScene(name: string, type: string, handler: SceneHandler) {
    scene_map.set(name, {
        type,
        handler
    })
}

export function gotoScene(name: string) {
    let s = scene_map.get(name)
    if (!s) throw "Scene Not Found!"
    const old_data = scene_data
    scene_data = new Map()
    if (s.type === 'inbuilt') {
        document.querySelectorAll(".scene").forEach((el: HTMLElement) => {
            el.style.display = el.id === name ? "block" : "none"
        })
        s.handler(old_data, scene_data)
    }
}