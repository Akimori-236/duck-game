import { Container } from "reactstrap"
import DuckGame from "./components/duck-game"

export default function App() {

  return (
    <Container>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-sky-100">
        <h1 className="text-3xl font-bold mb-6 text-center">Pixel Duck Runner</h1>
        <DuckGame />
      </main>
    </Container>
  )
}
