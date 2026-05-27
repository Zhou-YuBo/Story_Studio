import { createRouter, createWebHashHistory } from 'vue-router'

import InspirationView from '../views/InspirationView.vue'
import WorldView from '../views/WorldView.vue'
import CharacterView from '../views/CharacterView.vue'
import CharacterDimensionView from '../views/CharacterDimensionView.vue'
import CharacterInquiryView from '../views/CharacterInquiryView.vue'
import CharacterRelationshipView from '../views/CharacterRelationshipView.vue'
import CharacterCastUniverseView from '../views/CharacterCastUniverseView.vue'
import CharacterListView from '../views/CharacterListView.vue'
import StructureView from '../views/StructureView.vue'
import SceneView from '../views/SceneView.vue'
import ReminderView from '../views/ReminderView.vue'
import ExportView from '../views/ExportView.vue'

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
  },
  {
    path: '/character/list',
    component: CharacterListView
  },
  {
    path: '/character/dimensions',
    component: CharacterDimensionView
  },
  {
    path: '/character/inquiry',
    component: CharacterInquiryView
  },
  {
    path: '/character/relationships',
    component: CharacterRelationshipView
  },
  {
    path: '/character/cast-universe',
    component: CharacterCastUniverseView
  },
  {
    path: '/structure',
    component: StructureView
  },
  {
    path: '/scene',
    component: SceneView
  },
  {
    path: '/reminder',
    component: ReminderView
  },
  {
    path: '/export',
    component: ExportView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
