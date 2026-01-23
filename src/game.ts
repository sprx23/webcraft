import {
	AmbientLight,
	Color,
	DirectionalLight,
	Mesh,
	PerspectiveCamera,
	Scene,
	Vector3,
	WebGLRenderer,
} from "three";
import {
	BackendMessage,
	BackendMessageType,
	MAX_CHAT_LINES,
	PlayerState,
} from "./constants";
import { registerScene } from "./scene";
import { CoordinateSet } from "./workers/backend/utils";
// @ts-ignore
import BackendWorker from "./workers/backend/backend.worker";

registerScene("game", "inbuilt", () => new Game("test"));

export class ControllerData {
	yaw: number = 0;
	pitch: number = 0;
	keys: Record<string, boolean> = {};
	speed: number = 5;
	sensitivity: number = 0.002;
}

/**
 * This class is reponsible for keeping many related data and game methods together
 * suckless.org ppl should know classes keep code organized
 */
export class Game {
	backend: Worker;
	scene: Scene;
	camera: PerspectiveCamera;
	renderer: WebGLRenderer;
	controllerData: ControllerData = new ControllerData();
	debug = localStorage.getItem("debug_disabled") !== "true";

	// seriously this is the most genious line ever
	chatHistory: string[] = []; // nothing privacy killing
	playerState: PlayerState = null;
	old_pcx: number = null; // old values are used to determine if chunks need to be loaded
	old_pcy: number = null;
	old_pcz: number = null;
	chunks: Mesh[] = []; // coordinates would be given by Mesh.name!
	scheduledRender = new CoordinateSet(); // backend has been told of these chunk coordinates but they can be cancelled

	constructor(world: string) {
		this.backend = new BackendWorker();
		// Without bind this would refer to worker in class method! ABSURD!!
		this.backend.onmessage = this.backendMessageHandler.bind(this);
		this.backend.postMessage({ type: "init", world });

		// now initialize screen to show loading stuff
		this.writeChatMessage("Loading " + world);
	}

	// very very important method
	backendMessageHandler(me: MessageEvent<BackendMessage>) {
		const msg = me.data;

		if (msg.type === BackendMessageType.DEBUG_MSG && this.debug) {
			this.writeChatMessage("[DEBUG] " + msg.text);
		}

		// this is a misleading name because it may not nessarily mean
		// that world has fulled loaded if player skips some part
		if (msg.type === BackendMessageType.LOADING_COMPLETE) {
			this.startRenderer();
		}

		if (msg.type === BackendMessageType.MESH_DATA_ARRIVAL) {
		}

		// how syncing works is like this
		// player position updates are sent to backend
		// backend validates and returns same
		// however backend may also teleport player
		if (msg.type === BackendMessageType.SYNC_PLAYER_STATE) {
		}
	}

	/**
	 * This method is called when world is sufficently loaded
	 */
	startRenderer() {
		// scene stores all objects seen by player
		this.scene = new Scene();
		this.scene.background = new Color(0x87ceeb);
		this.camera = new PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000,
		);
		this.camera.position.set(0, 1.6, 5);

		// renderer is well renderer
		this.renderer = new WebGLRenderer({ antialias: true });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		document.getElementById("game").appendChild(this.renderer.domElement);

		// light is well light
		const light = new DirectionalLight(0xffffff, 1);
		light.position.set(5, 10, 5);
		this.scene.add(light);
		this.scene.add(new AmbientLight(0xffffff, 0.4));

		// Controls
		document.addEventListener(
			"keydown",
			(e) => (this.controllerData.keys[e.code] = true),
		);
		document.addEventListener(
			"keyup",
			(e) => (this.controllerData.keys[e.code] = false),
		);

		document.body.addEventListener("click", () => {
			document.body.requestPointerLock();
		});

		document.addEventListener("mousemove", this.onMouseMove);
		window.addEventListener("resize", this.onResize);
		this.animate();
	}

	onMouseMove(e: MouseEvent) {
		if (document.pointerLockElement !== document.body) return;

		this.controllerData.yaw -=
			e.movementX * this.controllerData.sensitivity;
		this.controllerData.pitch -=
			e.movementY * this.controllerData.sensitivity;

		this.controllerData.pitch = Math.max(
			-Math.PI / 2,
			Math.min(Math.PI / 2, this.controllerData.pitch),
		);

		this.camera.rotation.order = "YXZ";
		this.camera.rotation.y = this.controllerData.yaw;
		this.camera.rotation.x = this.controllerData.pitch;
	}

	onResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	updateMovement() {
		const dir = new Vector3();

		if (this.controllerData.keys["KeyW"]) dir.z -= 1;
		if (this.controllerData.keys["KeyS"]) dir.z += 1;
		if (this.controllerData.keys["KeyA"]) dir.x -= 1;
		if (this.controllerData.keys["KeyD"]) dir.x += 1;

		dir.normalize();

		// Move relative to camera yaw (FPS-style)
		const forward = new Vector3(
			Math.sin(this.controllerData.yaw),
			0,
			Math.cos(this.controllerData.yaw),
		);
		const right = new Vector3(
			Math.cos(this.controllerData.yaw),
			0,
			-Math.sin(this.controllerData.yaw),
		);

		this.camera.position.addScaledVector(
			forward,
			dir.z * this.controllerData.speed * 0.016,
		);
		this.camera.position.addScaledVector(
			right,
			dir.x * this.controllerData.speed * 0.016,
		);

		this.backend.postMessage({});
	}

	/**
	 * This method should be called every frame
	 */
	animate() {
		requestAnimationFrame(this.animate);
		this.updateMovement();
		this.renderer.render(this.scene, this.camera);
	}

	/**
	 * this thing only schedules chunk render data from backend
	 */
	chunkRenderer() {
		if (!this.playerState) return;
		if (
			this.playerState.pcx === this.old_pcx &&
			this.playerState.pcz === this.old_pcz
		)
			return;

		const cxmax = this.playerState.pcx + this.playerState.renderXZ;
		const cxmin = this.playerState.pcx - this.playerState.renderXZ;
		const czmax = this.playerState.pcz + this.playerState.renderXZ;
		const czmin = this.playerState.pcz - this.playerState.renderXZ;

		const chunksToRender: [number, number][] = new Array(
			this.playerState.renderXZ * this.playerState.renderXZ,
		);
		for (let z = czmin; z <= czmax; z++) {
			for (let x = cxmin; x <= cxmax; x++) {
				chunksToRender.push([x, z]);
			}
		}
		const names = chunksToRender.map(([x, z]) => `${x},${z}`);

		// now we know which chunks should be rendered
		// let's first throw out chunks
		for (let i = 0; i < this.chunks.length; i++) {
			const chunk = this.chunks[i];
			if (names.includes(chunk.name)) continue;
			this.scene.remove(chunk);
			chunk.geometry.dispose();
			// @ts-ignore
			chunk.material.dispose();
			this.chunks.splice(i, 1);
		}
	}

	/**
	 * Write some shit to chat
	 * Minecraft Way to format Alt + 12 (On Numpad) then some shit code
	 */
	writeChatMessage(text: string) {
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, "text/html");
		const safetext = doc.body.textContent || "";
		const writable = mcFormatterToHtml(safetext);
		this.chatHistory.push(writable);

		if (this.chatHistory.length > MAX_CHAT_LINES) {
			this.chatHistory.splice(
				0,
				this.chatHistory.length - MAX_CHAT_LINES,
			);
		}

		const elem = document.getElementById("game-chat");
		elem.innerHTML = this.chatHistory.join("<br>");
	}

	clearChat() {
		this.chatHistory = [];
		document.getElementById("game-chat").innerHTML = "";
	}
}

// Map Minecraft codes to HTML styles
export const mcToHtml = {
	"0": "color:black",
	"1": "color:darkblue",
	"2": "color:darkgreen",
	"3": "color:darkcyan",
	"4": "color:darkred",
	"5": "color:darkmagenta",
	"6": "color:gold",
	"7": "color:gray",
	"8": "color:darkgray",
	"9": "color:blue",
	a: "color:green",
	b: "color:cyan",
	c: "color:red",
	d: "color:magenta",
	e: "color:yellow",
	f: "color:white",
	l: "font-weight:bold",
	m: "text-decoration:line-through",
	n: "text-decoration:underline",
	o: "font-style:italic",
	r: "reset",
};

export function mcFormatterToHtml(input: string) {
	let result = "";
	let styles = [];

	// Split at § codes
	const parts = input.split(/§/g);

	parts.forEach((part: string | any[], index: number) => {
		if (index === 0) {
			result += part; // text before first §
			return;
		}
		const code = part[0].toLowerCase();
		const text = part.slice(1);

		if (code === "r") {
			styles = [];
		} else {
			styles.push(mcToHtml[code]);
		}

		if (text) {
			result += `<span style="${styles.filter(Boolean).join(";")}">${text}</span>`;
		}
	});

	return result;
}
