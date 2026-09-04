import { PlasmicCanvasHost } from '@plasmicapp/loader-react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StoryPlayer } from './features/story/StoryPlayer'
import './lib/plasmic-init'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/plasmic-host" element={<PlasmicCanvasHost />} />
        <Route path="/*" element={<StoryPlayer />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App