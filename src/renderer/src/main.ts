import './assets/main.css'

import { applyCssVars, buildCssVars } from './components/editor/page-layout/css-vars'
import { createApp } from 'vue'
import App from './App.vue'

import router from './router'

import { createPinia } from 'pinia'

applyCssVars(document.documentElement, buildCssVars())

const app = createApp(App)

app.use(router)

app.use(createPinia())

app.mount('#app')
