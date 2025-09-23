import { resizeAspectRatio } from "../util/util.js";
import { Shader, readShaderFile } from "../util/shader.js";

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let shader = null;
let vao = null;

const RECT_SIZE = 0.2;
const init_pos = 0;
const SPEED = 0.01;

let displacement = new Float32Array([0.0, 0.0]);


function initWebGL(){
    if (!gl){
        console.error('Webgl2 is not supported in your browser');
        return false;
    }
    canvas.width = 600;
    canvas.height = 600;

    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0,0.0,0.0,1.0);

    resizeAspectRatio(gl, canvas);
    console.log('WebGl initialized');
    return true;
}

async function initShader(){
    const vertexShaderSource = await readShaderFile('vertexShaderSource.glsl');
    const fragmentShaderSource = await readShaderFile('fragmentShaderSource.glsl');

    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function setBuffers(){
    const vertices = new Float32Array([
        init_pos-RECT_SIZE/2,  init_pos-RECT_SIZE/2, 0.0,
        init_pos+RECT_SIZE/2,  init_pos-RECT_SIZE/2, 0.0,
        init_pos+RECT_SIZE/2,  init_pos+RECT_SIZE/2, 0.0,
        init_pos-RECT_SIZE/2,  init_pos+RECT_SIZE/2, 0.0
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 0, 0);
}

function render(){
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.bindVertexArray(vao);
    shader.setVec4('movement', displacement[0],displacement[1],0,0);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    requestAnimationFrame(() => render());
}


window.addEventListener('keydown', event => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight'){
        if (event.key === 'ArrowUp' && displacement[1] + SPEED < 1 - RECT_SIZE/2){
            displacement[1] += SPEED;
        }
        if (event.key === 'ArrowDown' && displacement[1] - SPEED > -1 + RECT_SIZE/2){
            displacement[1] -= SPEED;
        }
        if (event.key === 'ArrowLeft' && displacement[0] - SPEED > -1 + RECT_SIZE/2){
            displacement[0] -= SPEED;
        }
        if (event.key === 'ArrowRight' && displacement[0] + SPEED < 1 - RECT_SIZE/2){
            displacement[0] += SPEED;
        }
    }
});


async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        
        await initShader();
        
        setBuffers();
        shader.use();
        
        render();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});

