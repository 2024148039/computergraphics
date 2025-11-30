import * as THREE from 'three';

/**
 * Item 클래스 - 수집 가능한 아이템
 */
export class Item {
    constructor(scene, position, id) {
        this.scene = scene;
        this.position = position.clone();
        this.id = id;
        this.isCollected = false;
        
        // 아이템 메시 생성 (기본: 구 모양) - 성능 최적화
        const geometry = new THREE.SphereGeometry(0.1, 16, 16); // 폴리곤 수 감소
        const material = new THREE.MeshStandardMaterial({
            color: 0xffd700, // 금색
            emissive: 0xffaa00,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = false; // 성능 최적화
        this.mesh.receiveShadow = false;
        
        scene.add(this.mesh);
        
        // 애니메이션 관련
        this.rotationSpeed = 1.0;
        this.floatSpeed = 2.0;
        this.floatAmount = 0.3;
        this.time = 0;
        this.baseY = position.y;
        
        // 수집 범위
        this.collectDistance = 2.0;
    }
    
    /**
     * 아이템 업데이트 (회전 및 부유 애니메이션)
     */
    update(delta) {
        if (this.isCollected) return;
        
        this.time += delta;
        
        // 회전
        this.mesh.rotation.y += this.rotationSpeed * delta;
        
        // 위아래 부유
        this.mesh.position.y = this.baseY + Math.sin(this.time * this.floatSpeed) * this.floatAmount;
    }
    
    /**
     * 플레이어가 아이템을 수집할 수 있는지 체크
     * @param {THREE.Vector3} playerPos - 플레이어 위치
     * @param {THREE.Vector3} playerDirection - 플레이어가 보는 방향
     * @param {number} viewAngle - 시야각 (라디안)
     */
    canCollect(playerPos, playerDirection, viewAngle = Math.PI / 3) {
        if (this.isCollected) return false;
        
        // 거리 체크
        const distance = playerPos.distanceTo(this.mesh.position);
        if (distance > this.collectDistance) return false;
        
        // 방향 체크 (플레이어가 아이템을 바라보고 있는지)
        const toItem = new THREE.Vector3()
            .subVectors(this.mesh.position, playerPos)
            .normalize();
        
        const dot = playerDirection.dot(toItem);
        const angle = Math.acos(dot);
        
        // 시야각 내에 있으면 수집 가능
        return angle < viewAngle;
    }
    
    /**
     * 아이템 수집
     */
    collect() {
        if (this.isCollected) return;
        
        this.isCollected = true;
        
        // 수집 애니메이션 (페이드 아웃 + 위로 올라감)
        const duration = 0.5;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // 위로 올라가기
            this.mesh.position.y = this.baseY + progress * 2;
            
            // 페이드 아웃
            this.mesh.material.opacity = 1 - progress;
            this.mesh.material.transparent = true;
            
            // 회전 가속
            this.mesh.rotation.y += 0.2;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 완전히 수집됨 - 씬에서 제거
                this.scene.remove(this.mesh);
            }
        };
        
        animate();
    }
    
    /**
     * 아이템 제거
     */
    remove() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
    
    getPosition() {
        return this.mesh.position.clone();
    }
}
