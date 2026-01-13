import { FirstInLastOutArray, CoordinateSet } from "./utils";
import { World } from "./world";

const TPS = 20;
const MS_PER_TICK = 1000 / TPS;
const tpsTimestamps = new FirstInLastOutArray<number>(TPS);
tpsTimestamps.fill(0);
const tickTimeLog = new FirstInLastOutArray<number>(TPS);
tickTimeLog.fill(0);
const meshingTimeLog = new FirstInLastOutArray<number>(TPS);
meshingTimeLog.fill(0);

let avgTickMS = 1; // should not be 0
let avgMeshingMS = 1;
let currentTPS = TPS;
let world: World = null;
const chunkio: Worker = new Worker("../dist/chunkio.js");
const scheduledForMesh = new CoordinateSet();

chunkio.addEventListener("message", (e) => {});

function startGame(w: World) {
    world = w;
    gameLoop();
}

function gameLoop() {
    const tickstart = performance.now();
    gameTick();
    const tickend = performance.now();
    const timeSpent1 = tickend - tickstart;
    tickTimeLog.push(timeSpent1);
    tpsTimestamps.push(tickend);

    const meshingstart = performance.now();
    let howMany = (MS_PER_TICK - timeSpent1) / avgMeshingMS;
    if (howMany < 1) howMany = 1;
    meshingTask(howMany);
    const meshingend = performance.now();
    const timeSpent2 = meshingend - meshingstart;
    meshingTimeLog.push(timeSpent2 / howMany);

    // calculations...
    // for avgMeshingMS
    avgMeshingMS = meshingTimeLog.getArray().reduce((x, y) => x + y) / TPS;
    avgTickMS = tickTimeLog.getArray().reduce((x, y) => x + y) / TPS;
    currentTPS = tpsTimestamps
        .getArray()
        .filter((x) => meshingend - x < 1000).length;

    // finally schedule next run
    const waitingTime = Math.max(0, MS_PER_TICK - timeSpent1 - timeSpent2 - 1);
    // we will start 1 ms earlier to fight against browser trottle
    setTimeout(gameLoop, waitingTime);
}

function gameTick() {
    // do other tasks such as chunk loading and generation
    // since they are done on a seperate thread, we will just schedule them all
    for (const ccoord of world.scheduledLoad) {
    }
}

function meshingTask(maxMeshingAllowed: number) {}
