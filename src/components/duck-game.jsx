"use client"

import { useConversation } from "@11labs/react"
import { useEffect, useRef, useState } from "react"
import { Button } from "reactstrap"

// Game constants
const GRAVITY = 0.6
const JUMP_FORCE = -12
const GROUND_HEIGHT = 20
const OBSTACLE_SPEED = 6
const OBSTACLE_FREQUENCY = 1500 // ms between obstacles
const DUCK_WIDTH = 40
const DUCK_HEIGHT = 40
const OBSTACLE_WIDTH = 20
const OBSTACLE_MIN_HEIGHT = 30
const OBSTACLE_MAX_HEIGHT = 60
const DUCK_PHRASES = [
  "Quack! Keep jumping!",
  "Watch out for those obstacles!",
  "You're doing great! Quack!",
  "Wow, nice jump!",
  "Quack quack! Try to beat your high score!",
  "I believe in you! Quack!",
  "Jump higher next time! Quack!",
  "Ouch! That looked painful!",
  "Let's try again! Quack quack!",
  "You're getting better! Quack!",
]

export default function DuckGame() {
  const canvasRef = useRef(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)

  const { startConversation, sendMessage, response, isLoading, error } = useConversation({
    apiKey: "x2zyJwRndQaAbDtLmbim",
    voiceId: "pNInz6obpgDQGcFmaJgB", // Default ElevenLabs voice ID, can be changed
  })

  // Game state refs (to avoid dependency issues in animation loop)
  const gameStateRef = useRef({
    duck: {
      x: 50,
      y: 0,
      velocity: 0,
      isJumping: false,
    },
    obstacles: [],
    lastObstacleTime: 0,
    animationFrameId: 0,
    score: 0,
  })

  // Handle keyboard and touch events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.code === "Space" || e.key === "ArrowUp") &&
        !gameStateRef.current.duck.isJumping &&
        gameStarted &&
        !gameOver
      ) {
        jump()
      } else if (e.code === "Space" && (gameOver || !gameStarted)) {
        restartGame()
      }
    }

    const handleTouchStart = () => {
      if (!gameStateRef.current.duck.isJumping && gameStarted && !gameOver) {
        jump()
      } else if (gameOver || !gameStarted) {
        restartGame()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("touchstart", handleTouchStart)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("touchstart", handleTouchStart)
    }
  }, [gameStarted, gameOver])

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = Math.min(800, window.innerWidth - 40)
      canvas.height = 300
      gameStateRef.current.duck.y = canvas.height - DUCK_HEIGHT - GROUND_HEIGHT
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Load stored high score
    const storedHighScore = localStorage.getItem("duckGameHighScore")
    if (storedHighScore) {
      setHighScore(Number.parseInt(storedHighScore))
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(gameStateRef.current.animationFrameId)
    }
  }, [])

  // Start game loop when game starts
  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoop()
    }
  }, [gameStarted, gameOver])

  const jump = () => {
    gameStateRef.current.duck.velocity = JUMP_FORCE
    gameStateRef.current.duck.isJumping = true
  }

  const restartGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Reset game state
    gameStateRef.current = {
      duck: {
        x: 50,
        y: canvas.height - DUCK_HEIGHT - GROUND_HEIGHT,
        velocity: 0,
        isJumping: false,
      },
      obstacles: [],
      lastObstacleTime: 0,
      animationFrameId: 0,
      score: 0,
    }

    setScore(0)
    setGameOver(false)
    setGameStarted(true)
  }

  const talkToDuck = () => {
    if (isLoading) return

    // Start conversation if not already started
    if (!response) {
      startConversation()
      return
    }

    // Send a random duck phrase
    const randomPhrase = DUCK_PHRASES[Math.floor(Math.random() * DUCK_PHRASES.length)]
    sendMessage(randomPhrase)
  }

  const gameLoop = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { duck, obstacles } = gameStateRef.current

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Update duck position
    duck.velocity += GRAVITY
    duck.y += duck.velocity

    // Ground collision
    if (duck.y > canvas.height - DUCK_HEIGHT - GROUND_HEIGHT) {
      duck.y = canvas.height - DUCK_HEIGHT - GROUND_HEIGHT
      duck.velocity = 0
      duck.isJumping = false
    }

    // Generate obstacles
    const currentTime = Date.now()
    if (currentTime - gameStateRef.current.lastObstacleTime > OBSTACLE_FREQUENCY) {
      const height = Math.floor(Math.random() * (OBSTACLE_MAX_HEIGHT - OBSTACLE_MIN_HEIGHT + 1) + OBSTACLE_MIN_HEIGHT)

      obstacles.push({
        x: canvas.width,
        width: OBSTACLE_WIDTH,
        height,
      })

      gameStateRef.current.lastObstacleTime = currentTime
    }

    // Update and draw obstacles
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i]
      obstacle.x -= OBSTACLE_SPEED

      // Remove obstacles that are off screen
      if (obstacle.x + obstacle.width < 0) {
        obstacles.splice(i, 1)
        i--
        continue
      }

      // Check for collision
      if (
        duck.x < obstacle.x + obstacle.width &&
        duck.x + DUCK_WIDTH > obstacle.x &&
        duck.y + DUCK_HEIGHT > canvas.height - GROUND_HEIGHT - obstacle.height
      ) {
        // Game over
        setGameOver(true)
        if (gameStateRef.current.score > highScore) {
          setHighScore(gameStateRef.current.score)
          localStorage.setItem("duckGameHighScore", gameStateRef.current.score.toString())
        }
        return
      }

      // Draw obstacle (cactus-like)
      ctx.fillStyle = "#2e7d32"
      ctx.fillRect(obstacle.x, canvas.height - GROUND_HEIGHT - obstacle.height, obstacle.width, obstacle.height)
    }

    // Update score
    gameStateRef.current.score += 1
    setScore(Math.floor(gameStateRef.current.score / 10))

    // Draw ground
    ctx.fillStyle = "#8b4513"
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT)

    // Draw duck
    drawDuck(ctx, duck.x, duck.y)

    // Continue game loop
    gameStateRef.current.animationFrameId = requestAnimationFrame(gameLoop)
  }

  const drawDuck = (ctx, x, y) => {
    // Duck body (yellow)
    ctx.fillStyle = "#ffeb3b"
    ctx.fillRect(x, y, DUCK_WIDTH, DUCK_HEIGHT)

    // Duck eye
    ctx.fillStyle = "#000"
    ctx.fillRect(x + 30, y + 10, 5, 5)

    // Duck bill
    ctx.fillStyle = "#ff9800"
    ctx.fillRect(x + 35, y + 20, 15, 10)

    // Duck feet
    if (!gameStateRef.current.duck.isJumping) {
      ctx.fillStyle = "#ff9800"
      ctx.fillRect(x + 10, y + DUCK_HEIGHT, 10, 5)
      ctx.fillRect(x + 25, y + DUCK_HEIGHT, 10, 5)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex justify-between w-full max-w-[800px]">
        <div className="text-lg font-bold">Score: {score}</div>
        <Button
          onClick={talkToDuck}
          variant="outline"
          className="mx-2"
          disabled={!gameStarted || gameOver || isLoading}
        >
          {isLoading ? "Duck is talking..." : response ? "Talk again" : "Talk to Duck"}
        </Button>
        <div className="text-lg font-bold">High Score: {highScore}</div>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} className="border-2 border-gray-400 bg-sky-200" />

        {response && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 p-3 rounded-xl border-2 border-yellow-400 max-w-[80%] z-10">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-yellow-300 rounded-full flex items-center justify-center text-lg">🦆</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{response}</p>
              </div>
            </div>
          </div>
        )}

        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
            <h2 className="text-2xl font-bold mb-4">Pixel Duck Runner</h2>
            <p className="mb-4 text-center">
              Press Space or tap to jump
              <br />
              Avoid the obstacles!
            </p>
            <Button onClick={() => setGameStarted(true)}>Start Game</Button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <p className="mb-4">Score: {score}</p>
            <Button onClick={restartGame}>Play Again</Button>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-center text-gray-600">Press Space or tap to jump. Avoid the obstacles!</div>
    </div>
  )
}

