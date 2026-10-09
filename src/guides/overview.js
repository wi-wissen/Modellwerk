import { createApp } from 'vue'
import Overview from './Overview.vue'
import i18n from '../i18n/index.js'
import '../style.css'

createApp(Overview).use(i18n).mount('#app')
