import * as THREE from 'three';

/**
 * Spotlight 클래스 - 플레이어를 추적하는 스포트라이트
 * @param {THREE.Scene} scene - Three.js 씬
 * @param {Player} player - 추적할 플레이어 객체
 * @param {Object} config - 스포트라이트 설정
 * @param {Array<THREE.Object3D>} config.obstacles - 장애물 리스트
 * @param {THREE.Vector3} config.startPosition - 시작 위치 (기본: (0, 8, 0))
 * @param {number} config.height - 스포트라이트 높이 (기본: 8)
 * @param {number} config.angle - 스포트라이트 각도 (기본: Math.PI / 12)
 * @param {number} config.intensity - 빛 강도 (기본: 300)
 * @param {number} config.distance - 빛 거리 (기본: 30)
 * @param {number} config.moveSpeed - 이동 속도 (기본: 2.0)
 * @param {number} config.chaseSpeed - 추적 속도 (기본: 3.5)
 * @param {number} config.normalColor - 기본 색상 (기본: 0xffffff)
 * @param {number} config.alertColor - 경보 색상 (기본: 0xff0000)
 * @param {Array<THREE.Vector3>} config.patrolPoints - 순찰 포인트 (선택)
 * @param {number} config.acceleration - 가속도 (기본: 15.0)
 * @param {number} config.damping - 감쇠 (기본: 0.92)
 * @param {boolean} config.enableConeVisualization - 원뿔 시각화 활성화 (기본: true)
 */
export class Spotlight {
    constructor(scene, player, config = {}) {
        this.scene = scene;
        this.player = player;
        
        // 설정 값 (기본값 설정)
        this.obstacles = config.obstacles || [];
        this.lightHeight = config.height || 8;
        this.normalColor = config.normalColor !== undefined ? config.normalColor : 0xffffff;
        this.alertColor = config.alertColor !== undefined ? config.alertColor : 0xff0000;
        this.moveSpeed = config.moveSpeed !== undefined ? config.moveSpeed : 2.0;
        this.chaseSpeed = config.chaseSpeed !== undefined ? config.chaseSpeed : 3.5;
        this.acceleration = config.acceleration !== undefined ? config.acceleration : 15.0;
        this.damping = config.damping !== undefined ? config.damping : 0.92;
        
        // Raycaster (가림 체크용)
        this.raycaster = new THREE.Raycaster();
        
        // 스포트라이트 생성
        const angle = config.angle !== undefined ? config.angle : Math.PI / 12;
        const intensity = config.intensity !== undefined ? config.intensity : 300;
        const distance = config.distance !== undefined ? config.distance : 30;
        
        // penumbra를 높여서 경계를 부드럽게 (0.2 -> 0.5), decay도 증가 (1.5 -> 2.0)
        this.light = new THREE.SpotLight(this.normalColor, intensity, distance, angle, 0.5, 2.0);
        
        const startPos = config.startPosition || new THREE.Vector3(0, this.lightHeight, 0);
        this.light.position.copy(startPos);
        
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 1024;
        this.light.shadow.mapSize.height = 1024;
        this.light.shadow.camera.near = 0.5;
        this.light.shadow.camera.far = distance;
        
        // 타겟을 스포트라이트 바로 아래로 설정 (항상 아래를 향하도록)
        this.light.target.position.set(startPos.x, 0, startPos.z);
        
        scene.add(this.light);
        scene.add(this.light.target);

        // 빛 원뿔 시각화 (volumetric light effect)
        this.enableConeVisualization = config.enableConeVisualization !== undefined ? config.enableConeVisualization : true;
        if (this.enableConeVisualization) {
            this.createLightCone();
        }

        // 상태
        this.isActive = false;
        this.isAlerted = false; // 경보 상태
        this.isChasing = false; // 추적 중
        
        // 스포트라이트 이동 패턴 (천장 위치)
        this.patternIndex = 0;
        if (config.patrolPoints && config.patrolPoints.length > 0) {
            this.patrolPoints = config.patrolPoints;
        } else {
            // 기본 순찰 포인트 (시작 위치 기준)
            this.patrolPoints = [
                new THREE.Vector3(startPos.x, this.lightHeight, startPos.z),
                new THREE.Vector3(startPos.x + 8, this.lightHeight, startPos.z + 5),
                new THREE.Vector3(startPos.x + 8, this.lightHeight, startPos.z - 5),
                new THREE.Vector3(startPos.x - 8, this.lightHeight, startPos.z - 5),
                new THREE.Vector3(startPos.x - 8, this.lightHeight, startPos.z + 5),
            ];
        }
        
        // 관성 (부드러운 이동)
        this.velocity = new THREE.Vector3();
        
        // 난이도 (아이템 수집에 따라 증가)
        this.difficulty = 0;
        this.baseSpeed = this.moveSpeed;
        this.baseAngle = this.light.angle;
        
        // 감지 타이머
        this.detectionTime = 0;
        this.maxDetectionTime = 3.0; // 3초
        this.escapeTime = 0;
        this.maxEscapeTime = 5.0; // 5초
    }

    createLightCone() {
        // 스포트라이트 각도에 맞춰 원뿔 크기 계산
        const height = this.lightHeight;
        const radius = Math.tan(this.light.angle) * height;
        
        // 그라디언트 텍스처 생성 (중심은 밝고 가장자리는 투명)
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 방사형 그라디언트 (중심에서 가장자리로)
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)'); // 중심
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // 가장자리
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        const texture = new THREE.CanvasTexture(canvas);
        
        // 스포트라이트 원뿔 시각화 (항상 아래를 향함)
        const coneGeometry = new THREE.ConeGeometry(radius, height, 32, 1, true);
        const coneMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            color: this.normalColor,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.lightCone = new THREE.Mesh(coneGeometry, coneMaterial);
        this.lightCone.position.set(
            this.light.position.x,
            this.lightHeight / 2,
            this.light.position.z
        );
        this.lightCone.rotation.x = 0;  // 기본적으로 아래를 향함
        this.scene.add(this.lightCone);
    }
    
    /**
     * 스포트라이트 제거 (여러 스포트라이트 관리 시 유용)
     */
    dispose() {
        this.scene.remove(this.light);
        this.scene.remove(this.light.target);
        if (this.lightCone) {
            this.scene.remove(this.lightCone);
            this.lightCone.geometry.dispose();
            this.lightCone.material.dispose();
        }
    }
    
    /**
     * 스포트라이트 위치 설정
     */
    setPosition(x, y, z) {
        this.light.position.set(x, y, z);
        if (this.lightCone) {
            this.lightCone.position.set(x, y / 2, z);
        }
    }
    
    /**
     * 스포트라이트 색상 설정
     */
    setColor(color) {
        this.normalColor = color;
        if (!this.isAlerted) {
            this.light.color.setHex(color);
            if (this.lightCone) {
                this.lightCone.material.color.setHex(color);
            }
        }
    }
    
    /**
     * 스포트라이트 각도 설정
     */
    setAngle(angle) {
        this.light.angle = angle;
        this.baseAngle = angle;
        
        // 원뿔 크기 업데이트
        if (this.lightCone) {
            const radius = Math.tan(angle) * this.lightHeight;
            this.lightCone.geometry.dispose();
            this.lightCone.geometry = new THREE.ConeGeometry(radius, this.lightHeight, 32, 1, true);
        }
    }
    
    /**
     * 이동 속도 설정
     */
    setMoveSpeed(speed) {
        this.moveSpeed = speed;
        this.baseSpeed = speed;
    }
    
    /**
     * 추적 속도 설정
     */
    setChaseSpeed(speed) {
        this.chaseSpeed = speed;
    }
    
    /**
     * 순찰 포인트 설정
     */
    setPatrolPoints(points) {
        this.patrolPoints = points;
        this.patternIndex = 0;
    }

    activate() {
        this.isActive = true;
    }

    setDifficulty(level) {
        this.difficulty = level;
        
        switch(level) {
            case 0:
                // 기본
                this.moveSpeed = this.baseSpeed;
                this.light.angle = this.baseAngle;
                break;
            case 1:
                // 아이템 1개: 속도 증가
                this.moveSpeed = this.baseSpeed * 1.5;
                break;
            case 2:
                // 아이템 2개: 범위 증가
                this.light.angle = this.baseAngle * 1.5;
                break;
            case 3:
                // 아이템 3개: 직선 추적
                this.isChasing = true;
                break;
        }
    }

    update(delta) {
        if (!this.isActive) return;

        // 스포트라이트 위치 업데이트 (항상 아래를 향함)
        if (this.difficulty < 3 && !this.isAlerted) {
            this.patrolUpdate(delta);
        } else if (this.isChasing || this.isAlerted) {
            this.chaseUpdate(delta);
        }
        
        // 관성 적용: 속도를 위치에 더하고 감쇠
        this.light.position.add(this.velocity.clone().multiplyScalar(delta));
        this.velocity.multiplyScalar(this.damping);

        // 타겟을 스포트라이트 바로 아래로 유지
        this.light.target.position.set(
            this.light.position.x,
            0,
            this.light.position.z
        );

        // 원뿔 위치 동기화 (항상 아래를 향하므로 회전은 필요 없음)
        if (this.lightCone) {
            this.lightCone.position.set(
                this.light.position.x,
                this.lightHeight / 2,
                this.light.position.z
            );
            
            // 색상 업데이트
            this.lightCone.material.color.setHex(
                this.isAlerted ? this.alertColor : this.normalColor
            );
        }

        // 플레이어 감지
        this.detectPlayer(delta);

        // Helper 업데이트 (주석 처리)
        // if (this.helper) this.helper.update();
    }

    patrolUpdate(delta) {
        // 순찰 경로를 따라 스포트라이트 위치 이동 (관성 적용)
        const targetPoint = this.patrolPoints[this.patternIndex];
        const direction = new THREE.Vector3()
            .subVectors(targetPoint, this.light.position)
            .normalize();

        const distance = this.light.position.distanceTo(targetPoint);
        
        if (distance < 0.5) {
            // 다음 포인트로
            this.patternIndex = (this.patternIndex + 1) % this.patrolPoints.length;
        } else {
            // 목표 속도 계산
            const desiredVelocity = direction.multiplyScalar(this.moveSpeed);
            // 가속도를 속도에 적용
            const steering = desiredVelocity.sub(this.velocity);
            this.velocity.add(steering.multiplyScalar(this.acceleration * delta));
        }
    }

    chaseUpdate(delta) {
        // 플레이어 위치 추적 (스포트라이트가 천장에서 플레이어 위로 이동, 관성 적용)
        const playerPos = this.player.getPosition();
        const targetPos = new THREE.Vector3(playerPos.x, this.lightHeight, playerPos.z);
        
        const direction = new THREE.Vector3()
            .subVectors(targetPos, this.light.position)
            .normalize();

        // 목표 속도 계산 (추적 시 더 빠름)
        const desiredVelocity = direction.multiplyScalar(this.chaseSpeed);
        // 가속도를 속도에 적용
        const steering = desiredVelocity.sub(this.velocity);
        this.velocity.add(steering.multiplyScalar(this.acceleration * delta));
    }

    detectPlayer(delta) {
        const playerPos = this.player.getPosition();
        const lightPos = this.light.position;
        
        // 스포트라이트 범위 내에 있는지 확인
        const horizontalDist = Math.sqrt(
            Math.pow(playerPos.x - lightPos.x, 2) +
            Math.pow(playerPos.z - lightPos.z, 2)
        );
        
        const maxRadius = Math.tan(this.light.angle) * lightPos.y;
        
        // 범위 밖이면 즉시 return
        if (horizontalDist >= maxRadius) {
            // 빛 밖으로 나감
            if (this.isAlerted) {
                this.escapeTime += delta;
                
                if (this.escapeTime >= this.maxEscapeTime) {
                    // 추적 포기
                    this.setAlert(false);
                    this.detectionTime = 0;
                }
            } else {
                this.detectionTime = 0;
            }
            this.player.setInSpotlight(false);
            return;
        }

        // 범위 안에 있으면 가림 체크 (Raycasting)
        const direction = new THREE.Vector3()
            .subVectors(playerPos, lightPos)
            .normalize();
        
        const distance = lightPos.distanceTo(playerPos);
        
        // 스포트라이트에서 플레이어로 광선 발사
        this.raycaster.set(lightPos, direction);
        this.raycaster.far = distance;
        
        const intersects = this.raycaster.intersectObjects(this.obstacles, true);
        
        // 장애물이 가로막고 있는지 확인
        const isBlocked = intersects.length > 0 && intersects[0].distance < distance - 0.1;
        
        if (isBlocked) {
            // 장애물 뒤에 숨음 - 감지 안 됨
            if (this.isAlerted) {
                this.escapeTime += delta;
                
                if (this.escapeTime >= this.maxEscapeTime) {
                    this.setAlert(false);
                    this.detectionTime = 0;
                }
            } else {
                this.detectionTime = 0;
            }
            this.player.setInSpotlight(false);
        } else {
            // 빛에 직접 노출됨 - 감지!
            this.detectionTime += delta;
            this.escapeTime = 0;
            this.player.setInSpotlight(true);
            
            if (this.detectionTime > 0.5 && !this.isAlerted) {
                // 경보 발동
                this.setAlert(true);
            }
            
            if (this.detectionTime >= this.maxDetectionTime) {
                // 게임 오버
                this.onPlayerCaught();
            }
        }
    }

    setAlert(alert) {
        this.isAlerted = alert;
        this.light.color.setHex(alert ? this.alertColor : this.normalColor);
        
        if (alert) {
            console.log('ALERT! Player detected!');
            // TODO: 경보음 재생
        } else {
            console.log('Alert cancelled');
            this.isChasing = false;
        }
    }

    onPlayerCaught() {
        console.log('GAME OVER - Player caught!');
        // TODO: 점프스케어 및 게임오버 처리
        this.detectionTime = 0;
    }

    getDetectionProgress() {
        return this.detectionTime / this.maxDetectionTime;
    }
}
