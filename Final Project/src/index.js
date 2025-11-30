import * as THREE from 'three';
import { Player } from './objects/player.js';
import { Spotlight } from './objects/Spotlight.js';
import { GameManager } from './core/GameManager.js';
import { MapLoader } from './core/MapLoader.js';
import { LightingManager } from './core/LightingManager.js';
import { ItemManager } from './core/ItemManager.js';
import { HUD } from './ui/HUD.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.spotlight = null;
        this.gameManager = null;
        this.itemManager = null;
        this.hud = null;
        this.clock = new THREE.Clock();
        
        // 조명 매니저
        this.lightingManager = null;
        
        // 게임 상태
        this.isGameWon = false;
        
        this.init();
    }

    async init() {
        // 렌더러 설정 (성능 최적화)
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 픽셀 비율 제한
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x000000);
        document.body.appendChild(this.renderer.domElement);
        
        // 조명 매니저 초기화 (게임 모드)
        this.lightingManager = new LightingManager(this.scene, this.renderer);
        this.lightingManager.setupGameMode();

        // 맵 로드 (비동기)
        const mapLoader = new MapLoader(this.scene);
        await mapLoader.createBasicMap();

        // 플레이어 생성 (맵의 충돌 오브젝트 전달)
        this.player = new Player(this.scene, this.camera, this.renderer, mapLoader.getObstacles());
        this.camera = this.player.camera;

        // 스포트라이트 생성 (새로운 config 기반 생성)
        this.spotlight = new Spotlight(this.scene, this.player, {
            obstacles: mapLoader.getObstacles(),
            startPosition: new THREE.Vector3(0, 5, 0),
            height: 5,
            angle: Math.PI / 12, 
            intensity: 300,
            distance: 30,
            moveSpeed: 2.0,  
            chaseSpeed: 3.5, 
            normalColor: 0xffffff,
            alertColor: 0xff0000,
            acceleration: 15.0,
            damping: 0.92,
            enableConeVisualization: true
        });
        
        // 여러 개의 스포트라이트를 추가하는 예시:
        // this.spotlights = [];
        // 
        // // 첫 번째 스포트라이트 (빠르고 좁은 범위)
        // this.spotlights.push(new Spotlight(this.scene, this.player, {
        //     obstacles: mapLoader.getObstacles(),
        //     startPosition: new THREE.Vector3(10, 8, 0),
        //     angle: Math.PI / 16,
        //     moveSpeed: 3.0,
        //     chaseSpeed: 5.0,
        //     normalColor: 0xffffff,
        //     alertColor: 0xff0000
        // }));
        // 
        // // 두 번째 스포트라이트 (느리고 넓은 범위)
        // this.spotlights.push(new Spotlight(this.scene, this.player, {
        //     obstacles: mapLoader.getObstacles(),
        //     startPosition: new THREE.Vector3(-10, 8, 0),
        //     angle: Math.PI / 8,
        //     moveSpeed: 1.5,
        //     chaseSpeed: 2.5,
        //     normalColor: 0x00ffff,
        //     alertColor: 0xffff00
        // }));
        // 
        // // 모든 스포트라이트 활성화
        // this.spotlights.forEach(spot => spot.activate());

        // 게임 매니저
        this.gameManager = new GameManager(this.scene, this.player, this.spotlight);
        
        // 아이템 매니저
        this.itemManager = new ItemManager(this.scene);
        this.player.setItemManager(this.itemManager);

        // HUD
        this.hud = new HUD(this.player, this.gameManager, this.itemManager);

        // 이벤트 리스너
        window.addEventListener('resize', () => this.onWindowResize());
        
        // 모드 토글 버튼 설정
        this.setupModeToggle();
        
        // 게임 시작
        this.animate();
    }
    
    setupModeToggle() {
        // 버튼 생성
        const button = document.createElement('button');
        button.id = 'mode-toggle';
        button.textContent = '게임 모드';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            padding: 12px 24px;
            background: #2a2a3e;
            color: white;
            border: 2px solid #5566bb;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 1000;
            transition: all 0.3s;
        `;
        
        button.addEventListener('click', () => {
            this.lightingManager.toggleMode();
            const mode = this.lightingManager.getMode();
            
            // 플레이어 개발자 모드도 함께 전환
            this.player.setDeveloperMode(mode === 'developer');
            
            button.textContent = mode === 'developer' ? '개발자 모드' : '게임 모드';
            button.style.background = mode === 'developer' ? '#4a4a5e' : '#2a2a3e';
        });
        
        button.addEventListener('mouseenter', () => {
            const mode = this.lightingManager.getMode();
            button.style.background = mode === 'developer' ? '#5a5a6e' : '#3a3a4e';
            button.style.transform = 'scale(1.05)';
        });
        
        button.addEventListener('mouseleave', () => {
            const mode = this.lightingManager.getMode();
            button.style.background = mode === 'developer' ? '#4a4a5e' : '#2a2a3e';
            button.style.transform = 'scale(1.0)';
        });
        
        document.body.appendChild(button);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.hud.onResize();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        // 업데이트
        if (this.gameManager.isPlaying()) {
            this.player.update(delta);
            this.spotlight.update(delta);
            this.gameManager.update(delta);
            this.itemManager.update(delta);
            
            // 아이템 수집 완료 체크
            if (!this.isGameWon && this.itemManager.isAllCollected()) {
                this.isGameWon = true;
                this.showWinScreen();
            }
        }

        this.hud.update();

        // 렌더링
        this.renderer.render(this.scene, this.camera);
    }
    
    showWinScreen() {
        // 승리 화면 표시
        const winScreen = document.createElement('div');
        winScreen.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #4af626;
            padding: 40px 60px;
            border: 3px solid #4af626;
            border-radius: 15px;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            z-index: 2000;
            box-shadow: 0 0 30px rgba(74, 246, 38, 0.5);
        `;
        winScreen.innerHTML = `
            <div>🎉 축하합니다! 🎉</div>
            <div style="font-size: 24px; margin-top: 20px;">모든 아이템을 수집했습니다!</div>
            <div style="font-size: 18px; margin-top: 30px; color: #aaa;">게임 클리어!</div>
        `;
        document.body.appendChild(winScreen);
        
        // 게임 일시정지
        this.gameManager.pause();
    }
}

// 게임 시작
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
