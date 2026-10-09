import { createApp } from 'vue'
import Landing from './Landing.vue'
import i18n from '../i18n/index.js'
import '../style.css'
import { registerOffline } from '../site/offline.js'

createApp(Landing).use(i18n).mount('#app')
registerOffline('./')
