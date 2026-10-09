import { createApp } from 'vue'
import Overview from './Overview.vue'
import i18n from '../i18n/index.js'
import '../style.css'
import { registerOffline } from '../site/offline.js'

createApp(Overview).use(i18n).mount('#app')
registerOffline('../')
