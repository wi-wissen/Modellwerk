import { createApp } from 'vue'
import GuidePage from './GuidePage.vue'
import i18n from '../i18n/index.js'
import '../style.css'

createApp(GuidePage).use(i18n).mount('#app')
