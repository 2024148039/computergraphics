import * as THREE from 'three';
import { Item } from '../objects/Item.js';

/**
 * ItemManager 클래스 - 아이템 생성 및 수집 관리
 */
export class ItemManager {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.collectedCount = 0;
        this.totalItems = 3;
        
        // 아이템 생성
        this.createItems();
    }
    
    /**
     * 아이템 생성 (기본 위치에 3개)
     */
    createItems() {
        // 아이템 위치들 (맵에 맞게 조정 필요)
        const itemPositions = [
            new THREE.Vector3(5, 1, 5),
            new THREE.Vector3(-5, 1, -5),
            new THREE.Vector3(8, 1, -8)
        ];
        
        itemPositions.forEach((pos, index) => {
            const item = new Item(this.scene, pos, index);
            this.items.push(item);
        });
    }
    
    /**
     * 아이템 업데이트
     */
    update(delta) {
        this.items.forEach(item => {
            item.update(delta);
        });
    }
    
    /**
     * 플레이어가 수집 가능한 아이템 찾기
     * @param {THREE.Vector3} playerPos - 플레이어 위치
     * @param {THREE.Vector3} playerDirection - 플레이어가 보는 방향
     */
    getCollectableItem(playerPos, playerDirection) {
        for (const item of this.items) {
            if (item.canCollect(playerPos, playerDirection)) {
                return item;
            }
        }
        return null;
    }
    
    /**
     * 아이템 수집 시도
     * @param {THREE.Vector3} playerPos - 플레이어 위치
     * @param {THREE.Vector3} playerDirection - 플레이어가 보는 방향
     */
    tryCollect(playerPos, playerDirection) {
        const item = this.getCollectableItem(playerPos, playerDirection);
        
        if (item) {
            item.collect();
            this.collectedCount++;
            return true;
        }
        
        return false;
    }
    
    /**
     * 모든 아이템을 수집했는지 확인
     */
    isAllCollected() {
        return this.collectedCount >= this.totalItems;
    }
    
    /**
     * 수집 진행률 반환
     */
    getProgress() {
        return {
            collected: this.collectedCount,
            total: this.totalItems,
            percentage: (this.collectedCount / this.totalItems) * 100
        };
    }
    
    /**
     * 모든 아이템 제거
     */
    dispose() {
        this.items.forEach(item => {
            item.remove();
        });
        this.items = [];
    }
}
