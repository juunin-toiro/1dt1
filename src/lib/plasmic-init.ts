import { initPlasmicLoader } from '@plasmicapp/loader-react'
import { StoryPlayer } from '../features/story/StoryPlayer'

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: 'wEYbdRG3mL9kWeHoiMDq6z',
      token:
        'A8lSrydPJ6wxcDZdwvIiLaMqZmPTvcwi0EakbQ5oPW2JJ59PJJVSY8WJw6rkbbDVqGYbADOSkGK37xmm7jw',
    },
  ],
  preview: true,
})

PLASMIC.registerComponent(StoryPlayer, {
  name: 'StoryPlayer',
  displayName: 'Story Player',
  description: 'Rendert die aktuelle One-Day-Loreline-Szene (Dialogzeile + Choices).',
  props: {},
  importPath: './features/story/StoryPlayer',
})
