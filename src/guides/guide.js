import { createApp } from 'vue'
import GuidePage from './GuidePage.vue'
import i18n from '../i18n/index.js'
import '../style.css'
import { registerOffline } from '../site/offline.js'

createApp(GuidePage).use(i18n).mount('#app')
registerOffline('../../')
