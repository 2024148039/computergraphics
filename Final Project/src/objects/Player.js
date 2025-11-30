import * as THREE from 'three';

export class Player {
    constructor(scene, camera, renderer, obstacles = []) {
        this.scene = scene;
        this.renderer = renderer;
        this.obstacles = obstacles;
        
        // 카메라 설정 (1인칭)
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 5); // 눈 높이

        // 마우스 드래그 컨트롤 관련
        this.isMouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.rotationX = 0; // 상하 회전 (pitch)
        this.rotationY = 0; // 좌우 회전 (yaw)
        this.mouseSensitivity = 0.002; // 마우스 감도
        
        // 플레이어 충돌 박스 (보이지 않음)
        const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        const material = new THREE.MeshBasicMaterial({ visible: false });
        this.collider = new THREE.Mesh(geometry, material);
        this.collider.position.copy(this.camera.position);
        scene.add(this.collider);

        // 충돌 감지용 Raycaster
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 0.5; // 충돌 감지 거리

        // 이동 관련
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveSpeed = 4.0;
        this.sprintSpeed = 6.0;
        this.isMoving = false;
        
        // 중력과 점프
        this.gravity = -20.0;  // 중력 가속도
        this.jumpVelocity = 7.0;  // 점프 속도
        this.velocityY = 0;  // 수직 속도
        this.isOnGround = true;  // 바닥에 있는지 여부 (시작은 true)
        this.minY = 0;  // 최소 높이 (바닥)
        
        // 플레이어 높이
        this.playerHeight = 1.6;  // 눈 높이

        // 스테미나
        this.maxStamina = 100;
        this.stamina = 100;
        this.staminaDrain = 25; // 초당 소모량
        this.staminaRegen = 15; // 초당 회복량
        this.canSprint = true;

        // 입력 상태
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.sprint = false;

        // 감지 상태
        this.inSpotlight = false;
        this.timeInLight = 0;
        
        // 개발자 모드
        this.isDeveloperMode = false;
        this.flySpeed = 10.0;
        this.flySpeedFast = 20.0;
        this.moveUp = false;
        this.moveDown = false;
        
        // 아이템 수집
        this.collectItem = false;
        this.itemManager = null; // 나중에 설정됨

        this.setupControls();
    }

    setupControls() {
        // 마우스 이벤트
        this.renderer.domElement.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.renderer.domElement.addEventListener('mouseup', (event) => this.onMouseUp(event));
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
        
        // 키보드 입력
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // 마우스 휠 이벤트 (개발자 모드 fly speed 조절)
        this.renderer.domElement.addEventListener('wheel', (event) => this.onMouseWheel(event));

        console.log('Mouse drag controls enabled');
    }

    onMouseDown(event) {
        this.isMouseDown = true;
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }

    onMouseUp(event) {
        this.isMouseDown = false;
    }

    onMouseMove(event) {
        if (!this.isMouseDown) return;

        // 마우스 이동량 계산
        const deltaX = event.clientX - this.mouseX;
        const deltaY = event.clientY - this.mouseY;

        this.mouseX = event.clientX;
        this.mouseY = event.clientY;

        // 회전 각도 업데이트
        this.rotationY -= deltaX * this.mouseSensitivity; // 좌우 (yaw)
        this.rotationX -= deltaY * this.mouseSensitivity; // 상하 (pitch)

        // 상하 회전 제한 (고개를 너무 많이 못 젖히도록)
        this.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotationX));

        // 카메라에 회전 적용
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.rotationY;
        this.camera.rotation.x = this.rotationX;
    }
    
    onMouseWheel(event) {
        // 개발자 모드에서만 동작
        if (this.isDeveloperMode) {
            event.preventDefault();
            // 휠 업: 속도 증가, 휠 다운: 속도 감소
            if (event.deltaY < 0) {
                this.flySpeed = Math.min(this.flySpeed + 2, 50);
            } else {
                this.flySpeed = Math.max(this.flySpeed - 2, 2);
            }
        }
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.sprint = true;
                break;
            case 'Space':
                if (this.isDeveloperMode) {
                    // 개발자 모드: 위로 날기
                    this.moveUp = true;
                } else {
                    // 게임 모드: 점프는 땅에 있을 때만
                    if (this.isOnGround) {
                        this.velocityY = this.jumpVelocity;
                        this.isOnGround = false;
                    }
                }
                break;
            case 'KeyC':
                if (this.isDeveloperMode) {
                    // 개발자 모드: 아래로 날기
                    this.moveDown = true;
                } else {
                    // 게임 모드: 아이템 수집
                    this.collectItem = true;
                }
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'KeyD':
                this.moveRight = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.sprint = false;
                break;
            case 'Space':
                this.moveUp = false;
                break;
            case 'KeyC':
                this.moveDown = false;
                this.collectItem = false;
                break;
        }
    }

    onMouseWheel(event) {
        // 개발자 모드에서만 동작
        if (this.isDeveloperMode) {
            event.preventDefault();
            // 휠 업: 속도 증가, 휠 다운: 속도 감소
            if (event.deltaY < 0) {
                this.flySpeed = Math.min(this.flySpeed + 2, 50);
            } else {
                this.flySpeed = Math.max(this.flySpeed - 2, 2);
            }
        }
    }
    
    checkCollision(direction) {
        // 장애물이 없으면 충돌 체크 건너뛰기
        if (this.obstacles.length === 0) return false;
        
        // 여러 높이에서 광선을 쏴서 충돌 체크 (발, 허리, 가슴)
        const checkHeights = [
            0.3,  // 발/발목 - 낮은 장애물
            0.6,  // 무릎 - 중간 낮은 장애물
            0.9,  // 허리 - 중간 장애물
            1.4   // 가슴 - 높은 장애물
        ];
        
        for (const heightOffset of checkHeights) {
            const checkPosition = this.camera.position.clone();
            checkPosition.y = checkPosition.y - this.playerHeight + heightOffset;
            
            this.raycaster.set(checkPosition, direction);
            this.raycaster.far = 0.5;
            const intersections = this.raycaster.intersectObjects(this.obstacles, true);
            
            // 하나라도 충돌하면 true
            if (intersections.length > 0 && intersections[0].distance < 0.5) {
                return true;
            }
        }
        
        return false;
    }

    setDeveloperMode(enabled) {
        this.isDeveloperMode = enabled;
        
        if (enabled) {
            // 개발자 모드 활성화 시 중력 무시
            this.velocityY = 0;
        } else {
            // 게임 모드로 돌아갈 때 위치 조정
            this.velocityY = 0;
        }
    }
    
    update(delta) {
        // 개발자 모드: 자유 비행
        if (this.isDeveloperMode) {
            this.updateDeveloperMode(delta);
            return;
        }
        
        // 게임 모드: 일반 물리 + 충돌
        this.updateGameMode(delta);
        
        // 아이템 수집 시도
        if (this.collectItem && this.itemManager) {
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            
            const collected = this.itemManager.tryCollect(this.camera.position, direction);
            if (collected) {
                console.log('아이템 수집!', this.itemManager.getProgress());
            }
            this.collectItem = false;
        }
    }
    
    updateDeveloperMode(delta) {
        // 이동 속도 결정
        const currentSpeed = this.sprint ? this.flySpeedFast : this.flySpeed;
        
        // 카메라 방향 벡터 (pitch 포함)
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        // 우측 벡터
        const right = new THREE.Vector3();
        right.crossVectors(this.camera.up, direction).normalize();
        
        // 이동 벡터
        const moveVector = new THREE.Vector3();
        
        if (this.moveForward) {
            moveVector.addScaledVector(direction, currentSpeed * delta);
        }
        if (this.moveBackward) {
            moveVector.addScaledVector(direction, -currentSpeed * delta);
        }
        if (this.moveRight) {
            moveVector.addScaledVector(right, -currentSpeed * delta);
        }
        if (this.moveLeft) {
            moveVector.addScaledVector(right, currentSpeed * delta);
        }
        if (this.moveUp) {
            moveVector.y += currentSpeed * delta;
        }
        if (this.moveDown) {
            moveVector.y -= currentSpeed * delta;
        }
        
        // 충돌 없이 바로 이동
        this.camera.position.add(moveVector);
        this.collider.position.copy(this.camera.position);
    }
    
    updateGameMode(delta) {
        // 이동 체크
        this.isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;

        // 스테미나 처리
        if (this.sprint && this.isMoving && this.stamina > 0) {
            this.stamina -= this.staminaDrain * delta;
            if (this.stamina <= 0) {
                this.stamina = 0;
                this.canSprint = false;
            }
        } else {
            // 스테미나 회복
            if (this.stamina < this.maxStamina) {
                this.stamina += this.staminaRegen * delta;
                if (this.stamina >= this.maxStamina) {
                    this.stamina = this.maxStamina;
                    this.canSprint = true;
                }
            }
        }
        
        // 중력 적용
        this.velocityY += this.gravity * delta;
        
        // 수직 이동
        this.camera.position.y += this.velocityY * delta;
        
        // 바닥 체크 및 충돌
        const groundLevel = this.minY + this.playerHeight;
        
        // 장애물이 있으면 raycasting으로 바닥 체크
        if (this.obstacles.length > 0) {
            const downDirection = new THREE.Vector3(0, -1, 0);
            this.raycaster.set(this.camera.position, downDirection);
            this.raycaster.far = this.playerHeight + 1;
            
            const intersections = this.raycaster.intersectObjects(this.obstacles, true);
            
            if (intersections.length > 0) {
                const groundY = intersections[0].point.y;
                const playerBottom = this.camera.position.y - this.playerHeight;
                
                // 바닥에 닿았거나 관통한 경우
                if (playerBottom <= groundY) {
                    this.camera.position.y = groundY + this.playerHeight;
                    this.velocityY = 0;
                    this.isOnGround = true;
                } else {
                    this.isOnGround = false;
                }
            } else {
                this.isOnGround = false;
            }
        } else {
            // 장애물 없으면 단순 바닥 체크
            if (this.camera.position.y <= groundLevel) {
                this.camera.position.y = groundLevel;
                this.velocityY = 0;
                this.isOnGround = true;
            } else {
                this.isOnGround = false;
            }
        }

        // 이동 속도 결정
        const currentSpeed = (this.sprint && this.canSprint && this.isMoving) 
            ? this.sprintSpeed 
            : this.moveSpeed;

        // 카메라의 Y축 회전만 사용 (수평 방향)
        const yawRotation = this.rotationY;
        
        // 전방 벡터 (카메라의 Y축 회전 기준)
        const forward = new THREE.Vector3(
            -Math.sin(yawRotation),
            0,
            -Math.cos(yawRotation)
        );

        // 우측 벡터
        const right = new THREE.Vector3(
            Math.sin(yawRotation + Math.PI / 2),
            0,
            Math.cos(yawRotation + Math.PI / 2)
        );

        // 이동 벡터 계산
        const moveVector = new THREE.Vector3();
        
        if (this.moveForward) {
            moveVector.addScaledVector(forward, currentSpeed * delta);
        }
        if (this.moveBackward) {    
            moveVector.addScaledVector(forward, -currentSpeed * delta);
        }
        if (this.moveRight) {
            moveVector.addScaledVector(right, currentSpeed * delta);
        }
        if (this.moveLeft) {
            moveVector.addScaledVector(right, -currentSpeed * delta);
        }
        
        // 충돌 체크를 하면서 이동
        if (moveVector.length() > 0) {
            const moveDirection = moveVector.clone().normalize();
            
            // 이동 방향으로 충돌 체크
            if (!this.checkCollision(moveDirection)) {
                this.camera.position.add(moveVector);
            } else {
                // 충돌시 X, Z 축 각각 시도 (미끄러짐 방지)
                const xMove = new THREE.Vector3(moveVector.x, 0, 0);
                const zMove = new THREE.Vector3(0, 0, moveVector.z);
                
                if (xMove.length() > 0 && !this.checkCollision(xMove.clone().normalize())) {
                    this.camera.position.add(xMove);
                }
                if (zMove.length() > 0 && !this.checkCollision(zMove.clone().normalize())) {
                    this.camera.position.add(zMove);
                }
            }
        }

        // 충돌 박스 위치 업데이트
        this.collider.position.copy(this.camera.position);
    }
    
    getPosition() {
        return this.camera.position;
    }

    getStaminaPercent() {
        return this.stamina / this.maxStamina;
    }

    setInSpotlight(inLight) {
        this.inSpotlight = inLight;
    }
    
    setItemManager(itemManager) {
        this.itemManager = itemManager;
    }
}
