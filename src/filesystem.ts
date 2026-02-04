const OBJECTSTORE_NAME = "gamefs"
const DATABASE_NAME = "sprx23_webcraft_saves"
const MFT_PATH = "/mft.csv"

export enum MFTColumns {
	PATH,
	CTIME,
	MTIME,
	SIZE
}

/**
 * This is a very crude file system utility, it will not check for existance
 * of dirs before creating files, doesn't allow paths longer than 64 characters,
 * and IDK what else to complain about this.
 */
export class FileSystem {

	private db: IDBDatabase;
	private mft: string[][];

	private constructor(db: IDBDatabase) {
		this.db = db;
	}

	init() {
		// read file /mft.csv
		const tx = this.db.transaction(OBJECTSTORE_NAME, "readonly");
		const store = tx.objectStore(OBJECTSTORE_NAME);
		const rq = store.get(MFT_PATH);
		const that = this;
		return new Promise<void>((a, r) => {
			rq.onerror = (e) => r(e);
			rq.onsuccess = () => {
				const bin: ArrayBuffer = rq.result.bin;
				const mft_csv = new TextDecoder().decode(bin);
				const table = mft_csv.split("\n").map(row => row.split(","));
				that.mft = table;
			}
		});
	}

	static connect() {
		const rq = indexedDB.open(DATABASE_NAME)
		return new Promise<FileSystem>((accept, reject) => {
			rq.onupgradeneeded = () => {
				const db = rq.result;
				// a very crude filesystem
				// only to store stuff
				// no stats
				db.createObjectStore(OBJECTSTORE_NAME, {
					keyPath: "path"
				})
			};
			rq.onerror = (e) => reject(e);
			rq.onsuccess = async () => {
				const fs = new FileSystem(rq.result);
				await fs.init();
				accept(fs);
			}
		})
	}

	validatePath(path: string) {
		if (path.length >= 64) throw new Error("Path too long! It must be atmost 64 characters");
		if (path.includes("\n") || path.includes(",")) throw new Error("Path cannot contain , or \\n");

		// now check if dirs exists
		//const parts = path.split("/");
		// but I will not do it for performance reasons
		// it will make system less secure
	}

	static path(...parts: string[]) {
		return parts[0][0] === '/' ? "" : "/" + parts.reduce((a, b) => a + "/" + b);
	}

	write(path: string[] | string, data: string, behv?: "dontoverride" | "override"): Promise<void>;
	write(path: string[] | string, data: ArrayBuffer, behv?: "dontoverride" | "override"): Promise<void>;
	write(path: string[] | string, data: string | ArrayBuffer, behv: "dontoverride" | "override" = "override"): Promise<void> {
		// @ts-ignore
		path = typeof path === "string" ? FileSystem.path(path) : FileSystem.path(...path);
		this.validatePath(path);

		const mft_row = this.mft.find(v => v[MFTColumns.PATH] === path);
		if (behv === "dontoverride" && mft_row) {
			throw new Error("File already exists!");
		}
		const bin = typeof data === "string" ? new TextEncoder().encode(data).buffer : data;

		// relaxed durability to make disk hit less
		const tx = this.db.transaction(OBJECTSTORE_NAME, "readwrite", { durability: "relaxed" });
		const store = tx.objectStore(OBJECTSTORE_NAME);

		// I know it looks trash, but whatever
		(behv === "dontoverride" ? store.add : store.put)({ path, bin });
		// now update MFT
		if (mft_row) {
			mft_row[MFTColumns.MTIME] = String(Date.now());
			mft_row[MFTColumns.SIZE] = String(bin.byteLength);
		} else {
			this.mft.push([path, String(Date.now()), String(Date.now()), String(bin.byteLength)]);
		}
		const mft_csv = this.mft.map(row => row.join(",")).join("\n");
		store.put({ path: MFT_PATH, bin: new TextEncoder().encode(mft_csv).buffer });
		tx.commit();

		return new Promise<void>((accept, reject) => {
			tx.onabort = () => reject(["Transaction aborted!"]);
			tx.onerror = (e) => reject(["Trasaction errored!", e])
			tx.oncomplete = () => accept();
		});
	}

	writeAll(paths: string[], data: ArrayBuffer[], behv: "override" | "dontoverride"): Promise<void> {
		throw new Error("Too lazy!");
	}

	exists(...path: string[]) {
		const p = FileSystem.path(...path);
		return this.mft.some(v => v[MFTColumns.PATH] === p);
	}

	list(...path: string[]) {
		const p = FileSystem.path(...path);
		return this.mft.filter(v => v[MFTColumns.PATH].startsWith(p));
	}

	move(old_path: string | string[], new_path: string | string[]) {
		throw new Error("Too lazy!");
	}

	copy(source_path: string | string[], destination_path: string | string[]) {
		throw new Error("Too lazy!");
	}

	read(...path: string[]): Promise<FileReader> {
		const p = FileSystem.path(...path);
		this.validatePath(p);

		const mft_row = this.mft.find(v => v[MFTColumns.PATH] === p);
		if (!mft_row) throw new Error("Cannot read a non-existant file!");
		const tx = this.db.transaction(OBJECTSTORE_NAME, "readonly");
		const rq = tx.objectStore(OBJECTSTORE_NAME).get(p);
		return new Promise((accept, reject) => {
			rq.onerror = (e) => reject(e);
			rq.onsuccess = () => accept(new FileReader(rq.result));
		});
	}
}

export class FileReader {
	buffer: ArrayBuffer;

	constructor(buffer: ArrayBuffer) {
		this.buffer = buffer;
	}

	text(): string {
		return new TextDecoder().decode(this.buffer);
	}

	json(): any {
		return JSON.parse(this.text());
	}

	/** Very naive csv parsing, may fail in complex strings */
	csv_unsafe(): string[][] {
		return this.text().split("\n").map(row => row.split(","));
	}

	/**
	 * Properties file reader, will coerce numbers and booleans, null,
	 * NaN, inf and -inf
	 * will not turn keys such as "localhost.port" into nested objects
	 */
	properties(): any {
		const result = {};
		const lines = this.text().split("\n");
		for (const line of lines) {
			let i = 0;
			for (i = 0; i < line.length; i++) {
				if (line[i] === '=' || line[i] === ':')
					break;
			}

			let value = i === line.length ? null : line.slice(i + 1, line.length - i - 1)
			// @ts-ignore
			if (value.toLowerCase() === "false") value = false;
			// @ts-ignore
			else if (value.toLowerCase() === "true") value = true;
			else if (value.toLowerCase() === "null") value = null;
			// @ts-ignore
			else if (value.toLowerCase() === "nan") value = Number.NaN;
			// @ts-ignore
			else if (value.toLowerCase() === "inf") value = Number.POSITIVE_INFINITY;
			// @ts-ignore
			else if (value.toLowerCase() === "-inf") value = Number.NEGATIVE_INFINITY;
			// @ts-ignore
			else if (value != "" && !isNaN(value) && isFinite(value)) {
				// @ts-ignore
				value = Number(value);
			}
			result[line.slice(0, i)] = value;
		}
		return result;
	}

	dataview(): DataView {
		return new DataView(this.buffer);
	}

	u8array(): Uint8Array {
		return new Uint8Array(this.buffer);
	}

	u16array(): Uint16Array {
		return new Uint16Array(this.buffer);
	}

	u32array(): Uint32Array {
		return new Uint32Array(this.buffer);
	}

	i8array(): Int8Array {
		return new Int8Array(this.buffer);
	}

	i16array(): Int16Array {
		return new Int16Array(this.buffer);
	}

	i32array(): Int32Array {
		return new Int32Array(this.buffer);
	}

	f32array(): Float32Array {
		return new Float32Array(this.buffer);
	}

	f64array(): Float64Array {
		return new Float64Array(this.buffer);
	}
}
