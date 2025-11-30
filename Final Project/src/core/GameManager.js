export const GameState = {
    INTRO: 'intro',
    PLAYING: 'playing',
    CAUGHT: 'caught',
    GAMEOVER: 'gameover',
    WIN: 'win'
};

export class GameManager {
    constructor(scene, player, spotlight) {
        this.scene = scene;
        this.player = player;
        this.spotlight = spotlight;
        
        this.state = GameState.INTRO;
        this.itemsCollected = 0;
        this.totalItems = 3;
        
        this.items = [];
        this.hasStarted = false;
        
        // 이벤트 리스너
        this.setupEvents();
    }

    setupEvents() {
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space' && this.state === GameState.INTRO) {
                this.startGame();
            }
            
            if (event.code === 'KeyR' && this.state === GameState.GAMEOVER) {
                this.restartGame();
            }
        });
    }

    startGame() {
        console.log('Game Started!');
        this.state = GameState.PLAYING;
        this.hasStarted = true;
        
        // 스포트라이트 활성화 (약간의 딜레이 후)
        setTimeout(() => {
            this.spotlight.activate();
            console.log('Spotlight activated!');
        }, 2000);
        
        // 아이템 생성
        this.createItems();
    }

    createItems() {
        // TODO: 아이템 생성 로직
        // 임시로 아이템 위치 정의
        const itemPositions = [
            { x: 10, y: 0.7, z: 10 },
            { x: -10, y: 0.7, z: -10 },
            { x: 15, y: 0.7, z: -5 }
        ];

        // 여기에 Item 클래스 사용
        console.log('Items created at:', itemPositions);
    }

    collectItem() {
        this.itemsCollected++;
        console.log(`Item collected! (${this.itemsCollected}/${this.totalItems})`);
        
        // 스포트라이트 난이도 증가
        this.spotlight.setDifficulty(this.itemsCollected);
        
        if (this.itemsCollected >= this.totalItems) {
            console.log('All items collected! Find the exit!');
        }
    }

    playerCaught() {
        this.state = GameState.CAUGHT;
        console.log('Player caught! Game Over!');
        
        setTimeout(() => {
            this.state = GameState.GAMEOVER;
        }, 2000);

    }

    restartGame() {
        console.log('Restarting game...');
        this.itemsCollected = 0;
        this.state = GameState.INTRO;
        this.hasStarted = false;
        
        // 플레이어 위치 초기화
        this.player.camera.position.set(0, 1.6, 5);
        
        // 스포트라이트 초기화
        this.spotlight.isActive = false;
        this.spotlight.setDifficulty(0);
        this.spotlight.setAlert(false);
    }

    update(delta) {
        if (this.state !== GameState.PLAYING) return;
    }

    isPlaying() {
        return this.state === GameState.PLAYING;
    }

    getState() {
        return this.state;
    }

    getItemsCollected() {
        return this.itemsCollected;
    }

    getTotalItems() {
        return this.totalItems;
    }
}
