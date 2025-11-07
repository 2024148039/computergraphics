export class SquarePyramid {
  constructor(gl, options = {}) {
    this.gl = gl; // Creating VAO and buffers

    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();
    this.ebo = gl.createBuffer(); // Base vertices for easy reference

    const v0 = [0.5, -0.5, 0.5]; // front-right
    const v1 = [-0.5, -0.5, 0.5]; // front-left
    const v2 = [-0.5, -0.5, -0.5]; // back-left
    const v3 = [0.5, -0.5, -0.5]; // back-right
    const v4 = [0.0, 0.5, 0.0]; // apex // Face Normals for flat shading

    const normalBase = [0, -1, 0];
    const n_norm = 1.0 / Math.sqrt(2); // ~0.707
    const normalFront = [0, n_norm, n_norm];
    const normalRight = [n_norm, n_norm, 0];
    const normalBack = [0, n_norm, -n_norm];
    const normalLeft = [-n_norm, n_norm, 0];

    this.vertices = new Float32Array([
      // Base (v0, v3, v2, v1) - Indices 0, 1, 2, 3
      ...v0,
      ...v3,
      ...v2,
      ...v1, // Front Face (v1, v0, v4) - Indices 4, 5, 6

      ...v1,
      ...v0,
      ...v4, // Right Face (v0, v3, v4) - Indices 7, 8, 9

      ...v0,
      ...v3,
      ...v4, // Back Face (v3, v2, v4) - Indices 10, 11, 12

      ...v3,
      ...v2,
      ...v4, // Left Face (v2, v1, v4) - Indices 13, 14, 15

      ...v2,
      ...v1,
      ...v4,
    ]);

    this.normals = new Float32Array([
      // Base (4 verts)
      ...normalBase,
      ...normalBase,
      ...normalBase,
      ...normalBase, // Front Face (3 verts)
      ...normalFront,
      ...normalFront,
      ...normalFront, // Right Face (3 verts)
      ...normalRight,
      ...normalRight,
      ...normalRight, // Back Face (3 verts)
      ...normalBack,
      ...normalBack,
      ...normalBack, // Left Face (3 verts)
      ...normalLeft,
      ...normalLeft,
      ...normalLeft,
    ]);

    if (options.color) {
      this.colors = new Float32Array(16 * 4);
      for (let i = 0; i < 16 * 4; i += 4) {
        this.colors.set(options.color, i);
      }
    } else {
      this.colors = new Float32Array([
        // Base (v0, v3, v2, v1) - White
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1, // Front Face (v1, v0, v4) - Red
        1,
        0,
        0,
        1,
        1,
        0,
        0,
        1,
        1,
        0,
        0,
        1, // Right Face (v0, v3, v4) - Green
        0,
        1,
        0,
        1,
        0,
        1,
        0,
        1,
        0,
        1,
        0,
        1, // Back Face (v3, v2, v4) - Blue
        0,
        0,
        1,
        1,
        0,
        0,
        1,
        1,
        0,
        0,
        1,
        1, // Left Face (v2, v1, v4) - Yellow
        1,
        1,
        0,
        1,
        1,
        1,
        0,
        1,
        1,
        1,
        0,
        1,
      ]);
    }

    this.texCoords = new Float32Array([
      // Base (v0(1,1), v3(1,0), v2(0,0), v1(0,1))
      1,1,
      1,0,
      0,0,
      0,1, // Front Face (v1(0,0), v0(1,0), v4(0.5, 1))

      0,0,
      1,0,
      0.5,1, // Right Face (v0(0,0), v3(1,0), v4(0.5, 1))

      0,
      0,
      1,
      0,
      0.5,
      1, // Back Face (v3(0,0), v2(1,0), v4(0.5, 1))

      0,
      0,
      1,
      0,
      0.5,
      1, // Left Face (v2(0,0), v1(1,0), v4(0.5, 1))

      0,
      0,
      1,
      0,
      0.5,
      1,
    ]); // 2) Vertex Indices (6 triangles total: 2 for base, 4 for sides)

    this.indices = new Uint16Array([
      // Base (v0, v3, v2, v1) -> (0, 1, 2), (2, 3, 0) : CCW from below
      0,
      1,
      2,
      2,
      3,
      0, // Using vertex array indices 0, 1, 2, 3 // Front Face (v1, v0, v4) -> (4, 5, 6)

      4,
      5,
      6, // Using vertex array indices 4, 5, 6 // Right Face (v0, v3, v4) -> (7, 8, 9)

      7,
      8,
      9, // Using vertex array indices 7, 8, 9 // Back Face (v3, v2, v4) -> (10, 11, 12)

      10,
      11,
      12, // Using vertex array indices 10, 11, 12 // Left Face (v2, v1, v4) -> (13, 14, 15)

      13,
      14,
      15, // Using vertex array indices 13, 14, 15
    ]);

    this.faceNormals = new Float32Array(this.normals);
    this.vertexNormals = new Float32Array(this.normals);

    this.initBuffers();
  }

  copyFaceNormalsToNormals() {
    this.normals.set(this.faceNormals);
    this.updateNormals();
  }

  copyVertexNormalsToNormals() {
    this.normals.set(this.vertexNormals);
    this.updateNormals();
  }

  initBuffers() {
    const gl = this.gl; // Calculate buffer sizes

    const vSize = this.vertices.byteLength;
    const nSize = this.normals.byteLength;
    const cSize = this.colors.byteLength;
    const tSize = this.texCoords.byteLength;
    const totalSize = vSize + nSize + cSize + tSize;

    gl.bindVertexArray(this.vao); // VBO에 데이터 복사 (Interleaved buffer)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
    gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
    gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
    gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords); // EBO에 인덱스 데이터 복사

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW); // vertex attributes 설정 // Location 0: position (vec3)

    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); // Location 1: normal (vec3)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize); // Location 2: color (vec4)
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize); // Location 3: texCoord (vec2)
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize); // vertex attributes 활성화

    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    gl.enableVertexAttribArray(3); // 버퍼 바인딩 해제

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  updateNormals() {
    const gl = this.gl;
    const vSize = this.vertices.byteLength;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); // normals 데이터만 업데이트

    gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  draw(shader) {
    const gl = this.gl;
    shader.use();
    gl.bindVertexArray(this.vao); // 총 인덱스 수: 2 (base tris) * 3 + 4 (side tris) * 3 = 6 + 12 = 18
    gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  delete() {
    const gl = this.gl;
    gl.deleteBuffer(this.vbo);
    gl.deleteBuffer(this.ebo);
    gl.deleteVertexArray(this.vao);
  }
}