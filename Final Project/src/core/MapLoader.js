import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class MapLoader {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.loader = new GLTFLoader();
        this.sceneModel = null;
    }

    async loadSceneModel() {
        return new Promise((resolve, reject) => {
            this.loader.load(
                '../assets/models/Scene2.glb',
                (gltf) => {
                    this.sceneModel = gltf.scene;
                    
                    // 그림자 설정 및 충돌 오브젝트 수집 (성능 최적화)
                    this.sceneModel.traverse((child) => {
                        if (child.isMesh) {
                            // 큰 오브젝트만 그림자 캐스트
                            const scale = child.scale.length();
                            if (scale > 1) {
                                child.castShadow = true;
                            } else {
                                child.castShadow = false;
                            }
                            child.receiveShadow = true;
                            
                            // 충돌 체크용 오브젝트 리스트에 추가
                            this.obstacles.push(child);
                        }
                    });
                    
                    this.scene.add(this.sceneModel);
                    console.log('Scene model loaded successfully');
                    console.log('Model:', this.sceneModel);
                    console.log('Collision objects:', this.obstacles.length);
                    resolve(this.sceneModel);
                },
                (progress) => {
                    if (progress.total > 0) {
                        console.log(`Loading: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
                    }
                },
                (error) => {
                    console.error('Error loading scene model:', error);
                    reject(error);
                }
            );
        });
    }

    async createBasicMap() {
        // GLTF 씬 모델 로드
        try {
            await this.loadSceneModel();
        } catch (error) {
            console.warn('Failed to load scene model, creating basic map instead');
            this.createFallbackMap();
        }

        // 그리드 헬퍼 (개발용)
        const gridHelper = new THREE.GridHelper(50, 50);
        this.scene.add(gridHelper);
    }

    createFallbackMap() {
        // 바닥
        const floorGeometry = new THREE.PlaneGeometry(50, 50);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 벽 (경계)
        this.createWalls();

        // 장애물 (숨을 수 있는 곳)
        this.createObstacles();
    }

    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.9
        });
        const wallHeight = 5;
        const wallThickness = 0.5;
        const mapSize = 50;

        // 4개의 벽
        const walls = [
            { pos: [0, wallHeight/2, -mapSize/2], size: [mapSize, wallHeight, wallThickness] },
            { pos: [0, wallHeight/2, mapSize/2], size: [mapSize, wallHeight, wallThickness] },
            { pos: [-mapSize/2, wallHeight/2, 0], size: [wallThickness, wallHeight, mapSize] },
            { pos: [mapSize/2, wallHeight/2, 0], size: [wallThickness, wallHeight, mapSize] },
        ];

        walls.forEach(wall => {
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.pos);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            this.scene.add(mesh);
        });
    }

    createObstacles() {
        const obstacleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.7
        });

        // 책상 같은 장애물들
        const obstacles = [
            { pos: [5, 0.5, 0], size: [3, 1, 1.5] },
            { pos: [-5, 0.5, 5], size: [2, 1, 2] },
            { pos: [8, 0.5, -8], size: [2.5, 1, 1] },
            { pos: [-8, 1, -5], size: [1.5, 2, 1.5] },
            { pos: [0, 0.75, -10], size: [4, 1.5, 1] },
        ];

        obstacles.forEach(obs => {
            const geometry = new THREE.BoxGeometry(...obs.size);
            const mesh = new THREE.Mesh(geometry, obstacleMaterial);
            mesh.position.set(...obs.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.obstacles.push(mesh);
        });
    }

    getObstacles() {
        return this.obstacles;
    }
}
