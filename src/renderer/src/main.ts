import './assets/main.css'

import { applyCssVars, buildCssVars } from './components/editor/page-layout/css-vars'
import { createApp } from 'vue'
import App from './App.vue'

import router from './router'

import { createPinia } from 'pinia'
import { useProjectStore } from './stores/project'

applyCssVars(document.documentElement, buildCssVars())

async function bootstrap(): Promise<void> {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(router)
  app.use(pinia)

  // hydrate is now deferred until the user selects a project in ProjectHallView

  window.addEventListener('beforeunload', () => {
    void useProjectStore(pinia).flushSave()
  })

  app.mount('#app')
}

void bootstrap()
