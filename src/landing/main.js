import { createApp } from 'vue'
import Landing from './Landing.vue'
import i18n from '../i18n/index.js'
import '../style.css'

createApp(Landing).use(i18n).mount('#app')
