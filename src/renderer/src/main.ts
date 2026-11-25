import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './assets/main.css'

const app = createApp(App)

app.config.errorHandler = (err, _instance, info) => {
  console.error(`[renderer] ${info}:`, err)
}

app.use(createPinia()).use(router).mount('#app')
