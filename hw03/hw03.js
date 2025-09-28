import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let isInitialized = false;  // main이 실행되는 순간 true로 change
let shader;
let vao;
let positionBuffer; // 2D position을 위한 VBO (Vertex Buffer Object)
let isDrawing = 0; // 원 중심 선택 -> 1 -> 원 두번째 점 선택 -> 2 -> 선분 점 1 선택 -> 3 -> 선분 점 2 선택 -> 4 
let startPoint = null;  // mouse button을 누른 위치
let tempEndPoint = null; // mouse를 움직이는 동안의 위치
let line = []; // 그려진 선분을 저장하는 array
let circle = []; // 그려진 원 위의 점들을 저장하는 array
let circle_center = null;
let radius = null;
let textOverlay1; // 원 정보 표시
let textOverlay2; // 선분 정보 표시
let textOverlay3; // 교점 정보 표시
let axes = new Axes(gl, 0.85); // x, y axes 그려주는 object (see util.js)
const CIRCLE_SEGMENTS = 360; // 원 해상도 정보 ( 360개의 점으로 원을 그림 )

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) { // true인 경우는 main이 이미 실행되었다는 뜻이므로 다시 실행하지 않음
        console.log("Already initialized");
        return;
    }

    main().then(success => { // call main function
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;

    resizeAspectRatio(gl, canvas);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);

    return true;
}

function setupBuffers() {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0); // x, y 2D 좌표

    gl.bindVertexArray(null);
}

function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,  // x/canvas.width 는 0 ~ 1 사이의 값, 이것을 * 2 - 1 하면 -1 ~ 1 사이의 값
        -((y / canvas.height) * 2 - 1) // y canvas 좌표는 상하를 뒤집어 주어야 하므로 -1을 곱함
    ];
}

function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault(); // 이미 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소 (div, body, html 등)으로 전파되지 않도록 방지

        const rect = canvas.getBoundingClientRect(); // canvas를 나타내는 rect 객체를 반환
        const x = event.clientX - rect.left;  // canvas 내 x 좌표
        const y = event.clientY - rect.top;   // canvas 내 y 좌표
        
        if (isDrawing == 0 || isDrawing == 2) { 
            // 그리고 있지 않은 상태 (즉, mouse down 상태가 아닌 경우)
            // 캔버스 좌표를 WebGL 좌표로 변환하여 선분의 시작점을 설정
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            startPoint = [glX, glY];
            isDrawing++; 
        }
    }

    function handleMouseMove(event) {
        if (isDrawing == 3) { // 선분을 그리고 있는 도중인 경우
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY]; // 임시 선분의 끝 point
            render();
        }
        else if (isDrawing == 1){ // 원을 그리고 있는 도중인 경우
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY];
            radius = Math.hypot(startPoint[0]-tempEndPoint[0],startPoint[1]-tempEndPoint[1]); // 2차원 거리 계산 함수
            circle = drawCircle(...startPoint,radius,CIRCLE_SEGMENTS);
            render();
        }
    }

    function handleMouseUp() {
        if (isDrawing == 1 && tempEndPoint) { // 원을 그린 경우
            radius = Math.hypot(startPoint[0]-tempEndPoint[0],startPoint[1]-tempEndPoint[1]);            
            circle = drawCircle(...startPoint,radius,CIRCLE_SEGMENTS);

            updateText(textOverlay1, "Circle: center (" + startPoint[0].toFixed(2) + ", " + startPoint[1].toFixed(2) + 
                ") radius = " + radius.toFixed(2));

            isDrawing++;
            circle_center = startPoint; // 원 중심 정보 저장
            startPoint = null;
            tempEndPoint = null;
            render();
        }
        else if (isDrawing == 3 && tempEndPoint){ // 선분을 그린 경우
            line = [...startPoint, ...tempEndPoint];

            updateText(textOverlay2, "Line segment: (" + line[0].toFixed(2) + ", " + line[1].toFixed(2) + 
                ") ~ (" + line[2].toFixed(2) + ", " + line[3].toFixed(2) + ")");
            
            isDrawing++;
            startPoint = null;
            tempEndPoint = null;
            render();
        }
    }

    

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}

// 원주 위의 점 좌표의 array를 생성해주는 함수
// cx : 중심의 x 좌표
// cy : 중심의 y 좌표
// radius : 반지름
// n : 점 개수, 높을수록 촘촘하게 그려짐.
function drawCircle(cx,cy,radius,n){
        const circle_vertices = [];
        for (let i=0; i<=n;i++){
            const theta = i / n * Math.PI * 2;
            const x = cx + Math.cos(theta) * radius;
            const y = cy + Math.sin(theta) * radius;
            circle_vertices.push(x,y);
        }
        return new Float32Array(circle_vertices);
}

// 교점 계산하는 함수
// 교점을 리스트에 담아서 반환
function calculateIntersection(){
    let intersections = [];
    let a = line[2] - line[0];
    let b = line[0];
    let c = line[3] - line[1];
    let d = line[1];
    let e = circle_center[0];
    let f = circle_center[1];
    let A = a**2 + c**2;
    let B = 2*(a*(b-e)+c*(d-f));
    let C = b**2+d**2+e**2+f**2- radius**2-2*(b*e + d*f);
    let D = B**2 - 4*A*C;
    if (D > 0){
        let t1 = (-B+Math.sqrt(D))/2/A;
        let t2 = (-B-Math.sqrt(D))/2/A;
        if (t1>=0 && t1 <= 1){
            intersections.push([a*t1+b,c*t1+d]);
        }
        if (t2>=0 && t2 <= 1){
            intersections.push([a*t2+b,c*t2+d]);
        }
    } else if (D == 0){
        let t = -B/2/A;
        if (t>=0 && t <= 1){
            intersections.push([a*t+b,c*t+d]);
        }
    }
    return intersections;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.use();
    
    // 원 그리기
    if (isDrawing==1&& circle){ // 임시 원 그리기
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, circle, gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINE_LOOP, 0, CIRCLE_SEGMENTS);
    } else if (isDrawing>=2&& circle){ // 완성된 원 그리기
        shader.setVec4("u_color", [1.0, 0.0, 1.0, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, circle, gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINE_LOOP, 0, CIRCLE_SEGMENTS);
    }

    // 선분 그리기
    if (isDrawing==3 && startPoint && tempEndPoint) { // 임시 선분 그리기
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]); 
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...tempEndPoint]), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, 2);
    } else if (isDrawing>=4&&line){ // 완성된 선분 그리기
        shader.setVec4("u_color", [0.3, 0.3, 0.8, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, 2);

        // 교점 그리기
        let points = calculateIntersection();
        if (points.length == 0){ // 교점 없음
            textOverlay3 = setupText(canvas, "No intersection", 3);
        } else if (points.length == 1){ // 교점 1개
            textOverlay3 = setupText(canvas, "Intersection Points: 1 Point 1: ("+points[0][0].toFixed(2)+", "+points[0][1].toFixed(2)+")", 3);
            shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points[0]), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.POINTS, 0, 1);
        } else{ // 교점 2개
            textOverlay3 = setupText(canvas, "Intersection Points: 2 Point 1: ("+points[0][0].toFixed(2)+", "+points[0][1].toFixed(2)+") Point 2: ("+points[1][0].toFixed(2)+", "+points[1][1].toFixed(2)+")", 3);
            shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...points[0],...points[1]]), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.POINTS, 0, 2);
        }
    }

    // axes 그리기
    axes.draw(mat4.create(), mat4.create()); // 두 개의 identity matrix를 parameter로 전달
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
            return false; 
        }

        // 셰이더 초기화
        await initShader();
        
        // 나머지 초기화
        setupBuffers();
        shader.use();

        // 텍스트 초기화
        textOverlay1 = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 2);

        
        // 마우스 이벤트 설정
        setupMouseEvents();
        
        // 초기 렌더링
        render();

        return true;
        
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

