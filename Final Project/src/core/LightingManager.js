import * as THREE from 'three';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

/**
 * 게임의 조명을 관리하는 클래스
 * 게임 모드와 개발자 모드 간 전환 지원
 */
export class LightingManager {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        
        // 조명 참조 저장
        this.lights = {
            ambient: null,
            point1: null,
            point2: null,
            point3: null
        };
        
        // 현재 모드
        this.isDeveloperMode = false;
        
        // GUI
        this.gui = null;
    }
    
    /**
     * 게임 모드 조명 설정 (어두운 공포 분위기)
     * 가까운 것은 보이되, 멀리는 fog로 가려지는 방식
     */
    setupGameMode() {
        this.removeAllLights();
        
        // 배경 - 어두운 검은색
        this.renderer.setClearColor(0x000000);
        
        // 안개 - 원거리만 가려지도록 조정 (density를 낮춤)
        // FogExp2의 density를 낮추면 멀리 있는 것만 가려짐
        this.scene.fog = new THREE.FogExp2(0x000000, 0.015);
        
        // 환경광 - 가까운 물체를 볼 수 있도록 적당히 밝게
        this.lights.ambient = new THREE.AmbientLight(0x404060, 0.4);
        this.scene.add(this.lights.ambient);
        
        // 실내 조명 - PointLight 여러 개 배치
        // 점광원 1 - 천장 중앙
        this.lights.point1 = new THREE.PointLight(0x6677cc, 1.5, 20);
        this.lights.point1.position.set(0, 5, 0);
        this.lights.point1.castShadow = true;
        this.lights.point1.shadow.mapSize.width = 512;
        this.lights.point1.shadow.mapSize.height = 512;
        this.scene.add(this.lights.point1);
        
        // 점광원 2 - 한쪽 구석
        this.lights.point2 = new THREE.PointLight(0x5566bb, 1.0, 15);
        this.lights.point2.position.set(8, 4, 8);
        this.lights.point2.castShadow = false; // 성능 최적화
        this.scene.add(this.lights.point2);
        
        // 점광원 3 - 반대편 구석
        this.lights.point3 = new THREE.PointLight(0x4455aa, 0.8, 15);
        this.lights.point3.position.set(-8, 4, -8);
        this.lights.point3.castShadow = false; // 성능 최적화
        this.scene.add(this.lights.point3);
        
        this.isDeveloperMode = false;
    }
    
    /**
     * 개발자 모드 조명 설정 (게임 모드와 동일한 조명 사용)
     */
    setupDeveloperMode() {
        this.removeAllLights();
        
        // 배경 - 게임 모드와 동일
        this.renderer.setClearColor(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.015);
        
        // 환경광 - 게임 모드와 동일
        this.lights.ambient = new THREE.AmbientLight(0x404060, 0.4);
        this.scene.add(this.lights.ambient);
        
        // 점광원들 - 게임 모드와 동일
        this.lights.point1 = new THREE.PointLight(0x6677cc, 1.5, 20);
        this.lights.point1.position.set(0, 5, 0);
        this.lights.point1.castShadow = true;
        this.lights.point1.shadow.mapSize.width = 512;
        this.lights.point1.shadow.mapSize.height = 512;
        this.scene.add(this.lights.point1);
        
        this.lights.point2 = new THREE.PointLight(0x5566bb, 1.0, 15);
        this.lights.point2.position.set(8, 4, 8);
        this.lights.point2.castShadow = false;
        this.scene.add(this.lights.point2);
        
        this.lights.point3 = new THREE.PointLight(0x4455aa, 0.8, 15);
        this.lights.point3.position.set(-8, 4, -8);
        this.lights.point3.castShadow = false;
        this.scene.add(this.lights.point3);
        
        this.isDeveloperMode = true;
        
        // GUI 생성
        this.setupGUI();
    }
    
    /**
     * 개발자 모드 GUI 설정
     */
    setupGUI() {
        // 기존 GUI 제거
        if (this.gui) {
            this.gui.destroy();
        }
        
        this.gui = new GUI();
        this.gui.title('조명 컨트롤');
        
        // 환경광 설정
        const ambientFolder = this.gui.addFolder('환경광 (Ambient Light)');
        ambientFolder.addColor({ color: this.lights.ambient.color.getHex() }, 'color')
            .name('색상')
            .onChange((value) => {
                this.lights.ambient.color.setHex(value);
            });
        ambientFolder.add(this.lights.ambient, 'intensity', 0, 2, 0.1)
            .name('강도');
        ambientFolder.open();
        
        // 점광원 1 설정
        const point1Folder = this.gui.addFolder('점광원 1 (Point Light 1)');
        point1Folder.addColor({ color: this.lights.point1.color.getHex() }, 'color')
            .name('색상')
            .onChange((value) => {
                this.lights.point1.color.setHex(value);
            });
        point1Folder.add(this.lights.point1, 'intensity', 0, 5, 0.1)
            .name('강도');
        point1Folder.add(this.lights.point1, 'distance', 0, 50, 1)
            .name('거리');
        point1Folder.add(this.lights.point1.position, 'x', -20, 20, 1)
            .name('위치 X');
        point1Folder.add(this.lights.point1.position, 'y', 0, 20, 1)
            .name('위치 Y');
        point1Folder.add(this.lights.point1.position, 'z', -20, 20, 1)
            .name('위치 Z');
        point1Folder.open();
        
        // 점광원 2 설정
        const point2Folder = this.gui.addFolder('점광원 2 (Point Light 2)');
        point2Folder.addColor({ color: this.lights.point2.color.getHex() }, 'color')
            .name('색상')
            .onChange((value) => {
                this.lights.point2.color.setHex(value);
            });
        point2Folder.add(this.lights.point2, 'intensity', 0, 5, 0.1)
            .name('강도');
        point2Folder.add(this.lights.point2, 'distance', 0, 50, 1)
            .name('거리');
        point2Folder.add(this.lights.point2.position, 'x', -20, 20, 1)
            .name('위치 X');
        point2Folder.add(this.lights.point2.position, 'y', 0, 20, 1)
            .name('위치 Y');
        point2Folder.add(this.lights.point2.position, 'z', -20, 20, 1)
            .name('위치 Z');
        
        // 점광원 3 설정
        const point3Folder = this.gui.addFolder('점광원 3 (Point Light 3)');
        point3Folder.addColor({ color: this.lights.point3.color.getHex() }, 'color')
            .name('색상')
            .onChange((value) => {
                this.lights.point3.color.setHex(value);
            });
        point3Folder.add(this.lights.point3, 'intensity', 0, 5, 0.1)
            .name('강도');
        point3Folder.add(this.lights.point3, 'distance', 0, 50, 1)
            .name('거리');
        point3Folder.add(this.lights.point3.position, 'x', -20, 20, 1)
            .name('위치 X');
        point3Folder.add(this.lights.point3.position, 'y', 0, 20, 1)
            .name('위치 Y');
        point3Folder.add(this.lights.point3.position, 'z', -20, 20, 1)
            .name('위치 Z');
        
        // 배경 및 안개
        const sceneFolder = this.gui.addFolder('장면 설정');
        sceneFolder.addColor({ color: this.renderer.getClearColor(new THREE.Color()).getHex() }, 'color')
            .name('배경 색상')
            .onChange((value) => {
                this.renderer.setClearColor(value);
            });
        sceneFolder.add(this.scene.fog, 'density', 0, 0.1, 0.001)
            .name('안개 밀도');
        sceneFolder.open();
    }
    
    /**
     * 모드 토글
     */
    toggleMode() {
        if (this.isDeveloperMode) {
            // GUI 제거
            if (this.gui) {
                this.gui.destroy();
                this.gui = null;
            }
            this.setupGameMode();
        } else {
            this.setupDeveloperMode();
        }
        return this.isDeveloperMode;
    }
    
    /**
     * 모든 조명 제거
     */
    removeAllLights() {
        if (this.lights.ambient) this.scene.remove(this.lights.ambient);
        if (this.lights.point1) this.scene.remove(this.lights.point1);
        if (this.lights.point2) this.scene.remove(this.lights.point2);
        if (this.lights.point3) this.scene.remove(this.lights.point3);
    }
    
    /**
     * 현재 모드 반환
     */
    getMode() {
        return this.isDeveloperMode ? 'developer' : 'game';
    }
}
