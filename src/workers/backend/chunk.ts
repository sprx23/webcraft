/**
 * A Chunk is basically a holder for Uint16Array and nothing more
 * But it has some fancy attributes too, for fast updation
 *
 * ATTENTION! In this code
 * cx, cy, cz -> Chunk Coords
 * wx, wy, wz -> World Coords (Of Voxels)
 * x, y, z -> Chunk Internal Coords (Of Voxels)
 * cwx, cwy, cwz -> World Coords of Chunk Corner (-x, -y, -z) corner
 *
 * 1) This implementation as well as mesher assume index x first, then z last y
 * So i = x + (z * CS) + (y * CS * CS)
 * 2) air must be 0
 */
export const CHUNK_SIZE = 16;
export class Chunk {
	data: Uint16Array;
	cx: number; // chunk coordinates of -X -Y -Z corner
	cy: number;
	cz: number;

	/**
	 * All dirty variables must be set true if chunk is modified in anyway
	 */
	dirty_save: boolean = false; // to be used in chunk saving, set true if generated

	constructor(data: Uint16Array, cx: number, cy: number, cz: number) {
		this.data = data;
		this.cx = cx;
		this.cy = cy;
		this.cz = cz;
	}

	static get_chunk_coord(wx: number, wy: number, wz: number) {
		return [Math.floor(wx / 16), Math.floor(wy / 16), Math.floor(wz / 16)];
	}

	static index_internal(x: number, y: number, z: number) {
		return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
	}

	/** Front is -Z, Right is +X, Top is +Y
	 * Front Face must face CCW winding
	 */
	static mesh(
		chunk: Chunk,
		up: Chunk,
		down: Chunk,
		left: Chunk,
		right: Chunk,
		front: Chunk,
		back: Chunk,
	) {
		let idx = 0;
		let face_count = 0;
		let CS1 = CHUNK_SIZE - 1;

		// TODO: Optimize this to remove function calls!
		/** CHATGPT version CS2 = CS * CS
              if (chunk.dirty_mesh) {
                let idx = 0;
                let face_count = 0;

                for (let y = 0; y < CS; y++) {
                    for (let z = 0; z < CS; z++) {
                    const yz = z + y * CS;

                    for (let x = 0; x < CS; x++, idx++) {
                        if (chunk.data[idx] === 0) continue;

                        // -X
                        if (
                        (x === 0  && left.data[CS1 + yz] === 0) ||
                        (x >  0  && chunk.data[idx - 1] === 0)
                        ) face_count++;

                        // +X
                        if (
                        (x === CS1 && right.data[yz] === 0) ||
                        (x <  CS1 && chunk.data[idx + 1] === 0)
                        ) face_count++;

                        // -Y
                        if (
                        (y === 0  && down.data[x + z * CS] === 0) ||
                        (y >  0  && chunk.data[idx - CS2] === 0)
                        ) face_count++;

                        // +Y
                        if (
                        (y === CS1 && up.data[x + z * CS] === 0) ||
                        (y <  CS1 && chunk.data[idx + CS2] === 0)
                        ) face_count++;

                        // -Z
                        if (
                        (z === 0  && back.data[x + y * CS] === 0) ||
                        (z >  0  && chunk.data[idx - CS] === 0)
                        ) face_count++;

                        // +Z
                        if (
                        (z === CS1 && front.data[x + y * CS] === 0) ||
                        (z <  CS1 && chunk.data[idx + CS] === 0)
                        ) face_count++;
                    }
                    }
                }

                chunk.face_count = face_count;
                chunk.dirty_mesh = false;
                } else {
                face_count = chunk.face_count;
                }
         *
         */
		for (let y = 0; y < CHUNK_SIZE; ++y) {
			for (let z = 0; z < CHUNK_SIZE; ++z) {
				for (let x = 0; x < CHUNK_SIZE; ++x, ++idx) {
					const block = chunk[idx];
					if (block === 0) continue; // skip air
					// -X Face
					if (
						(x === 0 &&
							left.data[Chunk.index_internal(CS1, y, z)] === 0) ||
						(x > 0 &&
							chunk.data[Chunk.index_internal(x - 1, y, z)] === 0)
					)
						face_count++;
					// +X Face
					if (
						(x === CS1 &&
							right.data[Chunk.index_internal(0, y, z)] === 0) ||
						(x < CS1 &&
							chunk.data[Chunk.index_internal(x + 1, y, z)] === 0)
					)
						face_count++;
					// -Y Face
					if (
						(y === 0 &&
							down.data[Chunk.index_internal(x, CS1, z)] === 0) ||
						(y > 0 &&
							chunk.data[Chunk.index_internal(x, y - 1, z)] === 0)
					)
						face_count++;
					// +Y Face
					if (
						(y === CS1 &&
							up.data[Chunk.index_internal(x, 0, z)] === 0) ||
						(y < CS1 &&
							chunk.data[Chunk.index_internal(x, y + 1, z)] === 0)
					)
						face_count++;
					// -Z Face
					if (
						(z === 0 &&
							back.data[Chunk.index_internal(x, y, CS1)] === 0) ||
						(z > 0 &&
							chunk.data[Chunk.index_internal(x, y, z - 1)] === 0)
					)
						face_count++;
					// +Z Face
					if (
						(z === CS1 &&
							front.data[Chunk.index_internal(x, y, 0)] === 0) ||
						(z < CS1 &&
							chunk.data[Chunk.index_internal(x, y, z + 1)] === 0)
					)
						face_count++;
				}
			}
		}

		const vertexCount = face_count * 4;
		const indexCount = face_count * 6;
		const positions = new Float32Array(vertexCount * 3);
		const normals = new Float32Array(vertexCount * 3);
		const uvs = new Float32Array(vertexCount * 2);
		const indices =
			vertexCount <= 0xffff
				? new Uint16Array(indexCount)
				: new Uint32Array(indexCount);
		let vp = 0; // position pointer
		let np = 0; // normal pointer
		let uvp = 0; // uv pointer
		let ip = 0; // index pointer
		let vert = 0; // current vertex index

		/**
		 * BIG FUCK!
		 * FIX THIS CODE TO NOT INCLUDE FUCKING WORLD coordinates
		 * FUCK
		 */
		const cwx = chunk.cx * CHUNK_SIZE;
		const cwy = chunk.cy * CHUNK_SIZE;
		const cwz = chunk.cz * CHUNK_SIZE;

		for (let y = 0; y < CHUNK_SIZE; ++y) {
			for (let z = 0; z < CHUNK_SIZE; ++z) {
				for (let x = 0; x < CHUNK_SIZE; ++x, ++idx) {
					const block = chunk[idx];
					if (block === 0) continue; // skip air

					const wx = cwx + x;
					const wy = cwy + y;
					const wz = cwz + z;
					// -X Face
					if (
						(x === 0 &&
							left.data[Chunk.index_internal(CS1, y, z)] === 0) ||
						(x > 0 &&
							chunk.data[Chunk.index_internal(x - 1, y, z)] === 0)
					) {
						// positions
						positions[vp++] = wx;
						positions[vp++] = wy;
						positions[vp++] = wz;
						positions[vp++] = wx;
						positions[vp++] = wy + 1;
						positions[vp++] = wz;
						positions[vp++] = wx;
						positions[vp++] = wy + 1;
						positions[vp++] = wz + 1;
						positions[vp++] = wx;
						positions[vp++] = wy;
						positions[vp++] = wz + 1;

						// normals
						for (let i = 0; i < 4; i++) {
							normals[np++] = -1;
							normals[np++] = 0;
							normals[np++] = 0;
						}

						// uvs
						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 0;

						// indices
						indices[ip++] = vert;
						indices[ip++] = vert + 1;
						indices[ip++] = vert + 2;
						indices[ip++] = vert;
						indices[ip++] = vert + 2;
						indices[ip++] = vert + 3;

						vert += 4;
					}
					// +X Face
					if (
						(x === CS1 &&
							right.data[Chunk.index_internal(0, y, z)] === 0) ||
						(x < CS1 &&
							chunk.data[Chunk.index_internal(x + 1, y, z)] === 0)
					) {
						positions[vp++] = wx + 1;
						positions[vp++] = wy;
						positions[vp++] = wz + 1;
						positions[vp++] = wx + 1;
						positions[vp++] = wy + 1;
						positions[vp++] = wz + 1;
						positions[vp++] = wx + 1;
						positions[vp++] = wy + 1;
						positions[vp++] = wz;
						positions[vp++] = wx + 1;
						positions[vp++] = wy;
						positions[vp++] = wz;

						for (let i = 0; i < 4; i++) {
							normals[np++] = 1;
							normals[np++] = 0;
							normals[np++] = 0;
						}

						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 0;

						indices[ip++] = vert;
						indices[ip++] = vert + 1;
						indices[ip++] = vert + 2;
						indices[ip++] = vert;
						indices[ip++] = vert + 2;
						indices[ip++] = vert + 3;

						vert += 4;
					}
					// -Y Face
					if (
						(y === 0 &&
							down.data[Chunk.index_internal(x, CS1, z)] === 0) ||
						(y > 0 &&
							chunk.data[Chunk.index_internal(x, y - 1, z)] === 0)
					) {
						positions[vp++] = wx;
						positions[vp++] = wy;
						positions[vp++] = wz + 1;
						positions[vp++] = wx + 1;
						positions[vp++] = wy;
						positions[vp++] = wz + 1;
						positions[vp++] = wx + 1;
						positions[vp++] = wy;
						positions[vp++] = wz;
						positions[vp++] = wx;
						positions[vp++] = wy;
						positions[vp++] = wz;

						for (let i = 0; i < 4; i++) {
							normals[np++] = 0;
							normals[np++] = -1;
							normals[np++] = 0;
						}

						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 0;

						indices[ip++] = vert;
						indices[ip++] = vert + 1;
						indices[ip++] = vert + 2;
						indices[ip++] = vert;
						indices[ip++] = vert + 2;
						indices[ip++] = vert + 3;

						vert += 4;
					}
					// +Y Face
					if (
						(y === CS1 &&
							up.data[Chunk.index_internal(x, 0, z)] === 0) ||
						(y < CS1 &&
							chunk.data[Chunk.index_internal(x, y + 1, z)] === 0)
					) {
						positions[vp++] = wx;
						positions[vp++] = wy + 1;
						positions[vp++] = wz;
						positions[vp++] = wx + 1;
						positions[vp++] = wy + 1;
						positions[vp++] = wz;
						positions[vp++] = wx + 1;
						positions[vp++] = wy + 1;
						positions[vp++] = wz + 1;
						positions[vp++] = wx;
						positions[vp++] = wy + 1;
						positions[vp++] = wz + 1;

						for (let i = 0; i < 4; i++) {
							normals[np++] = 0;
							normals[np++] = 1;
							normals[np++] = 0;
						}

						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 0;

						indices[ip++] = vert;
						indices[ip++] = vert + 1;
						indices[ip++] = vert + 2;
						indices[ip++] = vert;
						indices[ip++] = vert + 2;
						indices[ip++] = vert + 3;

						vert += 4;
					}
					// -Z Face
					if (
						(z === 0 &&
							back.data[Chunk.index_internal(x, y, CS1)] === 0) ||
						(z > 0 &&
							chunk.data[Chunk.index_internal(x, y, z - 1)] === 0)
					) {
						positions[vp++] = wx + 1;
						positions[vp++] = wy;
						positions[vp++] = wz;
						positions[vp++] = wx + 1;
						positions[vp++] = wy + 1;
						positions[vp++] = wz;
						positions[vp++] = wx;
						positions[vp++] = wy + 1;
						positions[vp++] = wz;
						positions[vp++] = wx;
						positions[vp++] = wy;
						positions[vp++] = wz;

						for (let i = 0; i < 4; i++) {
							normals[np++] = 0;
							normals[np++] = 0;
							normals[np++] = -1;
						}

						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 0;

						indices[ip++] = vert;
						indices[ip++] = vert + 1;
						indices[ip++] = vert + 2;
						indices[ip++] = vert;
						indices[ip++] = vert + 2;
						indices[ip++] = vert + 3;

						vert += 4;
					}
					// +Z Face
					if (
						(z === CS1 &&
							front.data[Chunk.index_internal(x, y, 0)] === 0) ||
						(z < CS1 &&
							chunk.data[Chunk.index_internal(x, y, z + 1)] === 0)
					) {
						positions[vp++] = wx;
						positions[vp++] = wy;
						positions[vp++] = wz + 1;
						positions[vp++] = wx;
						positions[vp++] = wy + 1;
						positions[vp++] = wz + 1;
						positions[vp++] = wx + 1;
						positions[vp++] = wy + 1;
						positions[vp++] = wz + 1;
						positions[vp++] = wx + 1;
						positions[vp++] = wy;
						positions[vp++] = wz + 1;

						for (let i = 0; i < 4; i++) {
							normals[np++] = 0;
							normals[np++] = 0;
							normals[np++] = 1;
						}

						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 0;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 1;
						uvs[uvp++] = 0;

						indices[ip++] = vert;
						indices[ip++] = vert + 1;
						indices[ip++] = vert + 2;
						indices[ip++] = vert;
						indices[ip++] = vert + 2;
						indices[ip++] = vert + 3;

						vert += 4;
					}
				}
			}
		}

		return {
			u: uvs.buffer,
			n: normals.buffer,
			i: indices.buffer,
			p: positions.buffer,
			t: indices.BYTES_PER_ELEMENT,
		};
	}
}
/*
    def index(self, x, y, z):
        ix = int(x - CHUNK_SIZE * self.chunk_coord[0])
        iy = int(y - CHUNK_SIZE * self.chunk_coord[1])
        iz = int(z - CHUNK_SIZE * self.chunk_coord[2])
        if (ix < 0 or ix >= CHUNK_SIZE): return -1
        if (iy < 0 or iy >= CHUNK_SIZE): return -1
        if (iz < 0 or iz >= CHUNK_SIZE): return -1
        return self.index_internal(ix, iy, iz)

    @staticmethod
    def anti_index_internal(i):
        x = i % CHUNK_SIZE
        y = (i // CHUNK_SIZE) % CHUNK_SIZE
        z = i // (CHUNK_SIZE * CHUNK_SIZE)
        return (x, y, z)

    # convert coordinate system to world
    def internal_to_world(self, x, y, z):
        return (x + CHUNK_SIZE * self.chunk_coord[0], y + CHUNK_SIZE * self.chunk_coord[1], z + CHUNK_SIZE * self.chunk_coord[2])

    # returns coordinates of block wrt world origin and not chunk origin
    def anti_index(self, i):
        (x, y, z) = self.anti_index_internal(i)
        return (x + CHUNK_SIZE * self.chunk_coord[0], y + CHUNK_SIZE * self.chunk_coord[1], z + CHUNK_SIZE * self.chunk_coord[2])

    # Might move this to C or GO
    # neightbours is dict with keys +y, -y, +x, -x, +z, -z, None chunks will be considered air
    # This will use basic chunk culling
    # Makes my brain spill blood
    # Basically each block has 6 f**king faces
    # Each face is 2 triangle
    # Each triangle needs 3 f**king vertices
    # And a uv on texture map
    # My brain is dying
    # Also we will assume (-x, -y, -z) vertex of block to be its origin
    # But we will fist check if a face is hidden or not

    # 1 day later: Code didn't worked so I used copilot (Bruh, I didn't want to use AI code directly)
    def update_geometry(self, neighbours: dict[str, "Chunk"]):
        start = time.perf_counter()
        vertices = []
        triangles = []
        normals = []
        uvs = []

        # set this to True if your renderer expects CCW front faces,
        # set to False if it expects CW (your current case sounds like False)
        FRONT_IS_CCW = True  # try switching to False if faces are visible from opposite side

        def add_face(face_verts: list[Vec3], expected_normal: Vec3):
            l = len(vertices)
            vertices.extend(face_verts)
            normals.extend([expected_normal] * 4)
            uvs.extend([(0,0), (0,1), (1,1), (1,0)])
            if FRONT_IS_CCW:
                # standard CCW front: (0,1,2) and (0,2,3)
                triangles.extend([(l, l+1, l+2), (l, l+2, l+3)])
            else:
                # flipped winding (CW front): reverse each triangle
                triangles.extend([(l, l+2, l+1), (l, l+3, l+2)])

        for i in range(len(self.data)):
            x, y, z = self.anti_index_internal(i)
            wx, wy, wz = self.internal_to_world(x, y, z)

            if self.data[i] == BLOCKS["air"]:
                continue

            # cube corners
            v000 = Vec3(wx,     wy,     wz)
            v100 = Vec3(wx + 1, wy,     wz)
            v110 = Vec3(wx + 1, wy + 1, wz)
            v010 = Vec3(wx,     wy + 1, wz)
            v001 = Vec3(wx,     wy,     wz + 1)
            v101 = Vec3(wx + 1, wy,     wz + 1)
            v111 = Vec3(wx + 1, wy + 1, wz + 1)
            v011 = Vec3(wx,     wy + 1, wz + 1)

            # -X face (expected normal = (-1,0,0))
            neighbour = neighbours["-x"]
            if (
                (x == 0 and (neighbour is None or neighbour.data[neighbour.index_internal(CHUNK_MAX, y, z)] == BLOCKS["air"]))
                or
                (x > 0 and self.data[self.index_internal(x - 1, y, z)] == BLOCKS["air"])
            ):
                add_face([v000, v010, v011, v001], Vec3(-1, 0, 0))

            # +X face
            neighbour = neighbours["+x"]
            if (
                (x == CHUNK_MAX and (neighbour is None or neighbour.data[neighbour.index_internal(0, y, z)] == BLOCKS["air"]))
                or
                (x != CHUNK_MAX and self.data[self.index_internal(x + 1, y, z)] == BLOCKS["air"])
            ):
                add_face([v101, v111, v110, v100], Vec3(1, 0, 0))

            # +Y face (top)
            neighbour = neighbours["+y"]
            if (
                (y == CHUNK_MAX and (neighbour is None or neighbour.data[neighbour.index_internal(x, 0, z)] == BLOCKS["air"]))
                or
                (y != CHUNK_MAX and self.data[self.index_internal(x, y + 1, z)] == BLOCKS["air"])
            ):
                add_face([v010, v110, v111, v011], Vec3(0, 1, 0))

            # -Y face (bottom)
            neighbour = neighbours["-y"]
            if (
                (y == 0 and (neighbour is None or neighbour.data[neighbour.index_internal(x, CHUNK_MAX, z)] == BLOCKS["air"]))
                or
                (y != 0 and self.data[self.index_internal(x, y - 1, z)] == BLOCKS["air"])
            ):
                add_face([v000, v001, v101, v100], Vec3(0, -1, 0))

            # +Z face (front)
            neighbour = neighbours["+z"]
            if (
                (z == CHUNK_MAX and (neighbour is None or neighbour.data[neighbour.index_internal(x, y, 0)] == BLOCKS["air"]))
                or
                (z != CHUNK_MAX and self.data[self.index_internal(x, y, z + 1)] == BLOCKS["air"])
            ):
                add_face([v001, v011, v111, v101], Vec3(0, 0, 1))

            # -Z face (back)
            neighbour = neighbours["-z"]
            if (
                (z == 0 and (neighbour is None or neighbour.data[neighbour.index_internal(x, y, CHUNK_MAX)] == BLOCKS["air"]))
                or
                (z != 0 and self.data[self.index_internal(x, y, z - 1)] == BLOCKS["air"])
            ):
                add_face([v100, v110, v010, v000], Vec3(0, 0, -1))
        mid = time.perf_counter()
        self.model.vertices=vertices
        self.model.normals=normals
        self.model.uvs=uvs
        self.model.triangles=triangles
        self.model.generate()
        end = time.perf_counter()
        print("TIME CALC", mid - start)
        print("TIME UPLD", end - mid)
        */
