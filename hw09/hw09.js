import * as THREE from 'three';  
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { initRenderer, initCamera, initStats, initOrbitControls, addGeometry} from './util.js';

let g_perspective = "Perspective";

const scene = new THREE.Scene();

const renderer = initRenderer();
let camera = initCamera(new THREE.Vector3(120, 60, 180));
scene.add(camera);

let orbitControls = initOrbitControls(camera, renderer);
const stats = initStats();

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

const textureLoader = new THREE.TextureLoader();

const Sun = new THREE.SphereGeometry(10, 20, 20)
const SunMesh = new THREE.Mesh(Sun, new THREE.MeshBasicMaterial({ color: 0xFFFF00 }));
SunMesh.position.x = 0;
SunMesh.castShadow = true;
scene.add(SunMesh);


const Mercury = new THREE.SphereGeometry(1.5, 20, 20)
const MercuryMesh = addGeometry(scene, Mercury,
                        textureLoader.load('Mercury.jpg'));
MercuryMesh.position.x = 20;
MercuryMesh.color = 0xa6a6a6;
MercuryMesh.castShadow = true;


const Venus = new THREE.SphereGeometry(3, 20, 20)
const VenusMesh = addGeometry(scene, Venus,
                        textureLoader.load('Venus.jpg'));
VenusMesh.position.x = 35;
VenusMesh.color = 0xe39e1c;
VenusMesh.castShadow = true;    

const Earth = new THREE.SphereGeometry(3.5, 20, 20)
const EarthMesh = addGeometry(scene, Earth,
                        textureLoader.load('Earth.jpg'));
EarthMesh.position.x = 50;
EarthMesh.color = 0x3498db;
EarthMesh.castShadow = true;

const Mars = new THREE.SphereGeometry(2.5, 20, 20)
const MarsMesh = addGeometry(scene, Mars,
                        textureLoader.load('Mars.jpg'));
MarsMesh.position.x = 65;
MarsMesh.color = 0xc0392b;
MarsMesh.castShadow = true;

const gui = new GUI();
const folderCamera = gui.addFolder('Camera');
const CameraParams = {
    switchCamera: function () {
        if (camera instanceof THREE.PerspectiveCamera) {
            scene.remove(camera);
            camera = null; // 기존의 camera 제거    
            // OrthographicCamera(left, right, top, bottom, near, far)
            camera = new THREE.OrthographicCamera(window.innerWidth / -16, 
                window.innerWidth / 16, window.innerHeight / 16, window.innerHeight / -16, -200, 500);
            
            camera.position.x = 120;
            camera.position.y = 60;
            camera.position.z = 180;
            
            camera.lookAt(scene.position);
            orbitControls.dispose(); // 기존의 orbitControls 제거
            orbitControls = null;
            orbitControls = new OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;
            g_perspective = "Orthographic";
            CameraParams.perspective = "Orthographic";
        } else {
            scene.remove(camera);
            camera = null; 
            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.x = 120;
            camera.position.y = 60;
            camera.position.z = 180;
            camera.lookAt(scene.position);
            orbitControls.dispose(); // 기존의 orbitControls 제거
            orbitControls = null;
            orbitControls = new OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;
            g_perspective = "Perspective";
            CameraParams.perspective = "Perspective";
        }
    },
    perspective: g_perspective
};

folderCamera.add(CameraParams, 'switchCamera').name('Switch Camera');
folderCamera.add(CameraParams, 'perspective').name('Current Camera').listen();

const folderMercury = gui.addFolder('Mercury');
const mercuryParams = {
    rotationSpeed: 0.02,
    orbitSpeed: 0.02,
};
folderMercury.add(mercuryParams, 'rotationSpeed', 0, 0.1).name('Rotation Speed');
folderMercury.add(mercuryParams, 'orbitSpeed', 0, 0.1).name('Orbit Speed');

const folderVenus = gui.addFolder('Venus');
const venusParams = {
    rotationSpeed: 0.015,
    orbitSpeed: 0.015,
};
folderVenus.add(venusParams, 'rotationSpeed', 0, 0.1).name('Rotation Speed');
folderVenus.add(venusParams, 'orbitSpeed', 0, 0.1).name('Orbit Speed');

const folderEarth = gui.addFolder('Earth');
const earthParams = {
    rotationSpeed: 0.01,
    orbitSpeed: 0.01,
};
folderEarth.add(earthParams, 'rotationSpeed', 0, 0.1).name('Rotation Speed');
folderEarth.add(earthParams, 'orbitSpeed', 0, 0.1).name('Orbit Speed');

const folderMars = gui.addFolder('Mars');
const marsParams = {
    rotationSpeed: 0.008,
    orbitSpeed: 0.008,
};
folderMars.add(marsParams, 'rotationSpeed', 0, 0.1).name('Rotation Speed');
folderMars.add(marsParams, 'orbitSpeed', 0, 0.1).name('Orbit Speed');

// 초기 궤도 반지름 저장
const mercuryOrbitRadius = 20;
const venusOrbitRadius = 35;
const earthOrbitRadius = 50;
const marsOrbitRadius = 65;

// 각 행성의 궤도 각도
let mercuryAngle = 0;
let venusAngle = 0;
let earthAngle = 0;
let marsAngle = 0;

render();

function render() {
    stats.update();
    orbitControls.update();
    
    // 자전 (rotation)
    MercuryMesh.rotation.y += mercuryParams.rotationSpeed;
    VenusMesh.rotation.y += venusParams.rotationSpeed;
    EarthMesh.rotation.y += earthParams.rotationSpeed;
    MarsMesh.rotation.y += marsParams.rotationSpeed;
    
    // 공전 (orbit)
    mercuryAngle += mercuryParams.orbitSpeed;
    MercuryMesh.position.x = Math.cos(mercuryAngle) * mercuryOrbitRadius;
    MercuryMesh.position.z = Math.sin(mercuryAngle) * mercuryOrbitRadius;
    
    venusAngle += venusParams.orbitSpeed;
    VenusMesh.position.x = Math.cos(venusAngle) * venusOrbitRadius;
    VenusMesh.position.z = Math.sin(venusAngle) * venusOrbitRadius;
    
    earthAngle += earthParams.orbitSpeed;
    EarthMesh.position.x = Math.cos(earthAngle) * earthOrbitRadius;
    EarthMesh.position.z = Math.sin(earthAngle) * earthOrbitRadius;
    
    marsAngle += marsParams.orbitSpeed;
    MarsMesh.position.x = Math.cos(marsAngle) * marsOrbitRadius;
    MarsMesh.position.z = Math.sin(marsAngle) * marsOrbitRadius;
    
    requestAnimationFrame(render);
    renderer.render(scene, camera);

}

