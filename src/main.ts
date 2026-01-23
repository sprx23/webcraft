import { registerScene, gotoScene } from "./scene";
import "./game";

registerScene("main-menu", "inbuilt", (o, dataset) => {
	const worlds = JSON.parse(
		localStorage.getItem("webcraft.worlds") ??
			'["FirstWorld!", "HelloWorld"]',
	);
	const list = document.getElementById("world_list");
	let s = "";
	for (const world of worlds) {
		s += `<tr><td>${world}</td><td><button class="mc-button">Play</button></td><td><button class="mc-button">Export</button></td><td><button class="mc-button">Delete</button></td></tr>`;
	}
	list.innerHTML = s;
	function hideIntro() {
		document.getElementById("intropara").style.display = "none";
	}
	document.getElementById("nevershow").onclick = () => {
		localStorage.setItem("nevershow_intropara", "true");
		hideIntro();
	};
	if (localStorage.getItem("nevershow_intropara") === "true") hideIntro();
});
gotoScene("game");
