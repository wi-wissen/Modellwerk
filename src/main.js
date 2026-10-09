import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n/index.js'
import './style.css'
import { registerOffline } from './site/offline.js'

createApp(App).use(i18n).mount('#app')
registerOffline('../')
