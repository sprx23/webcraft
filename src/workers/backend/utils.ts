export class FirstInLastOutArray<T> {
	private data: Array<T>;
	private ptr: number = -1;
	public length: number;
	constructor(len: number) {
		this.data = new Array(len);
		this.length = len;
	}
	push(elem: T) {
		this.data[++this.ptr % this.length] = elem;
	}
	/** Warning: Do not modify returned array! I will not copy for sake of speed */
	getArray() {
		return this.data;
	}
	fill(t: T) {
		this.data.fill(t);
	}
}

export class Map3D<T> {
	map: Map<number, Map<number, Map<number, T>>>;
	size: number;
	constructor() {
		this.map = new Map();
		this.size = 0;
	}

	_getXYZ(coord: number[]) {
		if (!Array.isArray(coord) || coord.length !== 3) {
			throw new TypeError("Coordinate must be [x, y, z]");
		}
		return coord;
	}

	set(coord: number[], value: T) {
		const [x, y, z] = this._getXYZ(coord);

		let mx = this.map.get(x);
		if (!mx) {
			mx = new Map();
			this.map.set(x, mx);
		}

		let my = mx.get(y);
		if (!my) {
			my = new Map();
			mx.set(y, my);
		}

		if (!my.has(z)) this.size++;
		my.set(z, value);
	}

	get(coord: number[]) {
		const [x, y, z] = this._getXYZ(coord);
		return this.map.get(x)?.get(y)?.get(z);
	}

	has(coord: number[]) {
		const [x, y, z] = this._getXYZ(coord);
		return this.map.get(x)?.get(y)?.has(z) ?? false;
	}

	delete(coord: number[]) {
		const [x, y, z] = this._getXYZ(coord);

		const mx = this.map.get(x);
		const my = mx?.get(y);
		if (!my || !my.has(z)) return false;

		my.delete(z);
		this.size--;

		if (my.size === 0) mx.delete(y);
		if (mx.size === 0) this.map.delete(x);

		return true;
	}

	clear() {
		this.map.clear();
		this.size = 0;
	}

	*[Symbol.iterator](): Generator<[number[], T]> {
		for (const [x, mx] of this.map) {
			for (const [y, my] of mx) {
				for (const [z, value] of my) {
					yield [[x, y, z], value];
				}
			}
		}
	}
}

export class CoordinateSet {
	map: Map<string, [number, number, number]>;
	constructor() {
		this.map = new Map(); // encoded key → coord array
	}

	_key([x, y, z]) {
		return `${x},${y},${z}`;
	}

	add(coord: [any, any, any]) {
		this.map.set(this._key(coord), coord);
	}

	has(coord: [any, any, any]) {
		return this.map.has(this._key(coord));
	}

	delete(coord: [any, any, any]) {
		return this.map.delete(this._key(coord));
	}

	clear() {
		this.map.clear();
	}

	get size() {
		return this.map.size;
	}

	*[Symbol.iterator]() {
		yield* this.map.values();
	}
}
