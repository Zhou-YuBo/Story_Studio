import { createRouter, createWebHashHistory } from 'vue-router'

import InspirationView from '../views/InspirationView.vue'
import WorldView from '../views/WorldView.vue'
import CharacterView from '../views/CharacterView.vue'

const routes = [
  {
    path: '/',
    component: InspirationView
  },
  {
    path: '/world',
    component: WorldView
  },
  {
    path: '/character',
    component: CharacterView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router