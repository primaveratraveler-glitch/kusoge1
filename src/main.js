(() => {
  const GAME_WIDTH = 800
  const GAME_HEIGHT = 600
  const INITIAL_MONEY = 10000
  const HIT_PENALTY = 3000
  const TARGET_TIME = 90
  const PLAYER_SCALE = 0.5
  const ENEMY_SCALE = 0.5

  class GameScene extends Phaser.Scene {
    constructor() { super('GameScene') }
    init() {
      this.money = INITIAL_MONEY
      this.remaining = TARGET_TIME
      this.isGameOver = false
      this.isClear = false
      this.hitLock = false
    }
    preload() {
      this.load.image('player', 'assets/自分.png')
      this.load.image('enemy', 'assets/敵.png')
    }
    create() {
      this.drawBackground()
      this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'player')
      this.player.setScale(PLAYER_SCALE)
      this.player.body.setSize(this.player.displayWidth, this.player.displayHeight, true)
      this.player.setDepth(1)
      this.player.body.setCollideWorldBounds(true)
      this.player.body.setAllowGravity(false)
      this.enemies = this.physics.add.group()
      this.cursors = this.input.keyboard.createCursorKeys()
      this.keyRestart = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      this.moneyText = this.add.text(16, 12, '', { fontSize: '20px', color: '#ffffff' }).setDepth(10)
      this.timeText = this.add.text(GAME_WIDTH - 16, 12, '', { fontSize: '20px', color: '#ffffff' }).setOrigin(1, 0).setDepth(10)
      this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', { fontSize: '36px', color: '#ffffff' }).setOrigin(0.5).setDepth(20).setVisible(false)
      this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 48, 'スペースでリトライ', { fontSize: '18px', color: '#cccccc' }).setOrigin(0.5).setDepth(20).setVisible(false)
      this.updateMoneyText()
      this.updateTimeText()
      this.setupScrolling()
      this.createJoystick()
      this.createRetryButton()
      this.physics.add.overlap(this.player, this.enemies, this.onPlayerHit, null, this)
      this.spawnDelay = 2000
      this.spawnTimer = this.time.addEvent({ delay: this.spawnDelay, loop: true, callback: this.spawnEnemy, callbackScope: this })
      this.difficultyTimer = this.time.addEvent({ delay: 15000, loop: true, callback: () => {
        this.spawnDelay = Math.max(800, this.spawnDelay - 200)
        if (this.spawnTimer) this.spawnTimer.remove(false)
        this.spawnTimer = this.time.addEvent({ delay: this.spawnDelay, loop: true, callback: this.spawnEnemy, callbackScope: this })
      }})
      this.countdownTimer = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
        if (this.isGameOver || this.isClear) return
        this.remaining -= 1
        this.updateTimeText()
        if (this.remaining <= 0) this.handleClear()
      }})
      this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT)
    }
    drawBackground() {
      const g = this.add.graphics()
      g.fillStyle(0x111318, 1)
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      g.fillStyle(0x1d1f27, 1)
      g.fillRect(0, 0, 120, GAME_HEIGHT)
      g.fillRect(GAME_WIDTH - 120, 0, 120, GAME_HEIGHT)
      g.fillStyle(0x0f1117, 1)
      g.fillRect(120, 0, GAME_WIDTH - 240, GAME_HEIGHT)
    }
    setupScrolling() {
      this.scrollSpeed = 140
      const gg = this.make.graphics({ x: 0, y: 0, add: false })
      gg.fillStyle(0xffffff, 0.95)
      gg.fillRect(0, 0, 8, 18)
      gg.generateTexture('dashTex', 8, 40)
      gg.destroy()
      this.laneTile = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, 8, GAME_HEIGHT, 'dashTex').setAlpha(0.85)
      this.laneTile.setDepth(0)
      const colors = [0xff4081, 0x40c4ff, 0xffea00, 0x69f0ae, 0xff6d00]
      this.signs = this.add.group()
      for (let i = 0; i < 8; i++) {
        const y = Phaser.Math.Between(0, GAME_HEIGHT)
        const col1 = colors[i % colors.length]
        const col2 = colors[(i + 2) % colors.length]
        const l = this.add.rectangle(40 + Phaser.Math.Between(0, 40), y, Phaser.Math.Between(60, 90), 12, col1, 0.9).setDepth(0)
        const r = this.add.rectangle(GAME_WIDTH - (40 + Phaser.Math.Between(0, 40)), y + 40, Phaser.Math.Between(60, 90), 12, col2, 0.9).setDepth(0)
        this.signs.add(l)
        this.signs.add(r)
      }
    }
    updateMoneyText() { this.moneyText.setText(`所持金: ¥${this.money.toLocaleString()}`) }
    updateTimeText() { this.timeText.setText(`残り: ${Math.max(0, this.remaining)}s`) }
    spawnEnemy() {
      if (this.isGameOver || this.isClear) return
      const m = 20
      const edge = Phaser.Math.Between(0, 3)
      let x, y
      if (edge === 0) { x = Phaser.Math.Between(m, GAME_WIDTH - m); y = -m }
      else if (edge === 1) { x = Phaser.Math.Between(m, GAME_WIDTH - m); y = GAME_HEIGHT + m }
      else if (edge === 2) { x = -m; y = Phaser.Math.Between(m, GAME_HEIGHT - m) }
      else { x = GAME_WIDTH + m; y = Phaser.Math.Between(m, GAME_HEIGHT - m) }
      const w = 22, h = 30
      const enemy = this.physics.add.sprite(x, y, 'enemy')
      enemy.setScale(ENEMY_SCALE)
      enemy.body.setSize(enemy.displayWidth, enemy.displayHeight, true)
      enemy.body.setCollideWorldBounds(true)
      enemy.body.setBounce(0.2)
      enemy.body.setAllowGravity(false)
      enemy.speed = Phaser.Math.Between(60, 100) + Math.floor((TARGET_TIME - Math.max(0, this.remaining)) / 15) * 8
      this.enemies.add(enemy)
    }
    onPlayerHit(player) {
      if (this.hitLock || this.isGameOver || this.isClear) return
      this.hitLock = true
      this.money -= HIT_PENALTY
      this.updateMoneyText()
      this.cameras.main.flash(200, 255, 255, 255)
      this.cameras.main.fadeOut(200, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        player.x = GAME_WIDTH / 2
        player.y = GAME_HEIGHT - 80
        player.body.setVelocity(0, 0)
        this.tweens.add({ targets: player, alpha: { from: 0.3, to: 1 }, duration: 800, yoyo: true, repeat: 3 })
        this.clearNearbyEnemies(player, 120)
        this.cameras.main.fadeIn(200, 0, 0, 0)
        if (this.money < 0) this.handleGameOver(); else this.time.delayedCall(800, () => { this.hitLock = false })
      })
    }
    clearNearbyEnemies(player, radius) {
      const r2 = radius * radius
      this.enemies.children.iterate(e => {
        if (!e || !e.active) return
        const dx = e.x - player.x
        const dy = e.y - player.y
        if (dx * dx + dy * dy <= r2) e.destroy()
      })
    }
    handleGameOver() {
      this.isGameOver = true
      this.showEndTexts('店に連れていかれてスッカラカン…', 'スペースでリトライ')
      this.stopAllEnemies()
    }
    handleClear() {
      this.isClear = true
      this.showEndTexts('今日はうまく避け切った！', 'スペースで再挑戦')
      this.stopAllEnemies()
    }
    stopAllEnemies() { this.enemies.children.iterate(e => { if (!e || !e.body) return; e.body.setVelocity(0, 0) }) }
    showEndTexts(main, hint) {
      this.statusText.setText(main).setVisible(true)
      this.hintText.setText(hint).setVisible(true)
    }
    createRetryButton() {
      const x = GAME_WIDTH - 90
      const y = GAME_HEIGHT - 50
      this.retryBtn = this.add.rectangle(x, y, 130, 50, 0x2b2b2b, 0.6).setStrokeStyle(2, 0xffffff, 0.5).setDepth(12).setInteractive({ useHandCursor: true })
      this.retryLbl = this.add.text(x, y, 'リトライ', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5).setDepth(12)
      this.retryBtn.on('pointerdown', () => { this.retryBtn.setScale(0.97) })
      this.retryBtn.on('pointerup', () => { this.retryBtn.setScale(1); this.restartGame() })
    }
    createJoystick() {
      const baseX = 90
      const baseY = GAME_HEIGHT - 90
      const base = this.add.circle(baseX, baseY, 48, 0x222222, 0.35).setStrokeStyle(2, 0xffffff, 0.3).setDepth(12)
      const knob = this.add.circle(baseX, baseY, 28, 0xffffff, 0.5).setDepth(12)
      this.jstick = { base, knob, active: false, vec: new Phaser.Math.Vector2(0, 0), radius: 48 }
      this.input.on('pointerdown', p => {
        if (p.x <= GAME_WIDTH * 0.5 && p.y >= GAME_HEIGHT * 0.5) { this.jstick.active = true; this.updateJoystick(p.x, p.y) }
      })
      this.input.on('pointermove', p => { if (this.jstick.active) this.updateJoystick(p.x, p.y) })
      this.input.on('pointerup', () => { this.jstick.active = false; this.jstick.vec.set(0, 0); knob.setPosition(base.x, base.y) })
    }
    updateJoystick(x, y) {
      const dx = x - this.jstick.base.x
      const dy = y - this.jstick.base.y
      const len = Math.hypot(dx, dy)
      const clamped = Math.min(len, this.jstick.radius)
      const nx = len ? dx / len : 0
      const ny = len ? dy / len : 0
      this.jstick.knob.setPosition(this.jstick.base.x + nx * clamped, this.jstick.base.y + ny * clamped)
      this.jstick.vec.set(nx, ny)
    }
    restartGame() { this.scene.restart() }
    update() {
      if (this.isGameOver || this.isClear) { if (Phaser.Input.Keyboard.JustDown(this.keyRestart)) this.restartGame(); return }
      const body = this.player.body
      const speed = 200
      const dt = this.game.loop.delta / 1000
      if (this.laneTile) this.laneTile.tilePositionY += this.scrollSpeed * dt
      if (this.signs) {
        this.signs.children.iterate(s => {
          if (!s) return
          s.y += this.scrollSpeed * dt
          if (s.y > GAME_HEIGHT + 20) s.y = -20
        })
      }
      let vx = 0, vy = 0
      if (this.jstick && this.jstick.active) {
        vx = this.jstick.vec.x * speed
        vy = this.jstick.vec.y * speed
      } else {
        if (this.cursors.left.isDown) vx -= speed
        if (this.cursors.right.isDown) vx += speed
        if (this.cursors.up.isDown) vy -= speed
        if (this.cursors.down.isDown) vy += speed
      }
      if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2 }
      body.setVelocity(vx, vy)
      this.enemies.children.iterate(e => {
        if (!e || !e.body) return
        const dx = this.player.x - e.x
        const dy = this.player.y - e.y
        const len = Math.hypot(dx, dy) || 1
        const vxx = (dx / len) * e.speed
        const vyy = (dy / len) * e.speed
        e.body.setVelocity(vxx, vyy)
      })
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0b0b0f',
    parent: 'game-container',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: [GameScene]
  }

  window.addEventListener('load', () => { new Phaser.Game(config) })
})()
