export class SquarePyramid {
    constructor(gl){
        this.gl = gl;

        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        this.vertices = new Float32Array([
            // front face 
            -0.5,0.0,0.5, 0.5,0.0,0.5, 0.0,1.0,0.0,
            // right face
            0.5,0.0,0.5, 0.5,0.0,-0.5, 0.0,1.0,0.0,
            // back face
            0.5,0.0,-0.5, -0.5,0.0,-0.5, 0.0,1.0,0.0,
            // left face
            -0.5,0.0,-0.5, -0.5,0.0,0.5, 0.0,1.0,0.0,
            // bottom face
            -0.5,0.0,0.5, 0.5,0.0,0.5, 0.5,0.0,-0.5, -0.5,0.0,-0.5,
        ]);

        // this.normals = new Float32Array([
        //     // front face
        //     0, 2/Math.sqrt(5), 1/Math.sqrt(5),  0, 2/Math.sqrt(5), 1/Math.sqrt(5),  0, 2/Math.sqrt(5), 1/Math.sqrt(5),
        //     // right face
        //     1/Math.sqrt(5), 2/Math.sqrt(5), 0,  1/Math.sqrt(5), 2/Math.sqrt(5), 0,  1/Math.sqrt(5), 2/Math.sqrt(5), 0,
        //     // back face
        //     0, 2/Math.sqrt(5), -1/Math.sqrt(5),  0, 2/Math.sqrt(5), -1/Math.sqrt(5),  0, 2/Math.sqrt(5), -1/Math.sqrt(5),
        //     // left face
        //     -1/Math.sqrt(5), 2/Math.sqrt(5), 0,  -1/Math.sqrt(5), 2/Math.sqrt(5), 0,  -1/Math.sqrt(5), 2/Math.sqrt(5), 0,
        //     // bottom face
        //     0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0, 
        // ]);

        this.colors = new Float32Array([
            // front face
            1, 0, 0, 1,   1, 0, 0, 1,   1, 0, 0, 1,
            // right face
            1, 1, 0, 1,   1, 1, 0, 1,   1, 1, 0, 1,
            // back face
            1, 0, 1, 1,   1, 0, 1, 1,   1, 0, 1, 1,
            // left face
            0, 1, 1, 1,   0, 1, 1, 1,   0, 1, 1, 1,
            // bottom face
            0, 0, 1, 1,   0, 0, 1, 1,   0, 0, 1, 1,  0, 0, 1, 1,
        ]);

        this.indices = new Uint16Array([
            // front face
            0, 1, 2,
            // right face
            3, 4, 5,
            // back face
            6, 7, 8,
            // left face
            9, 10, 11, 
            // bottom face 
            12, 13, 14, 14, 15, 12
        ]);

        this.sameVertices = new Uint16Array([
            2, 5, 8, 11,  // indices of the same vertices as the top point
            0, 10, 12,
            1, 3, 13,
            4, 6, 14,
            7, 9, 15,
        ]);

        this.initBuffers();    
    }

    initBuffers(){
        const gl = this.gl;

        const vSize = this.vertices.byteLength;
        const cSize = this.colors.byteLength;
        const totalSize = vSize + cSize;

        gl.bindVertexArray(this.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.colors);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0 , vSize);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    draw(shader){
        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
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