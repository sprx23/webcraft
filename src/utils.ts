/*
 * This file contains utils common to both workers and ui threads
 * All Utility functions must be kept here
 */

export function coordEq([x1, y1, z1]: [number, number, number], [x2, y2, z2]: [number, number, number]) {
	return x1 === x2 && y1 === y2 && z1 === z2;
}

export function sq(x: number) {
	return x * x;
}

export function distSq([x1, y1, z1]: [number, number, number], [x2, y2, z2]: [number, number, number]) {
	return sq(x1 - x2) + sq(y1 - y2) + sq(z1 - z2);
}

export function coordKey([x, y, z]: [number, number, number]) {
	return `${x},${y},${z}`;
}

export function coordAdd([x1, y1, z1]: [number, number, number], [x2, y2, z2]: [number, number, number]): [number, number, number] {
	return [x1 + x2, y1 + y2, z1 + z2];
}

export function indexOfCoord(array: [number, number, number][], coord: [number, number, number]) {
	for (const i in array) {
		if (coordEq(array[i], coord)) return Number(i);
	}
	return -1;
}