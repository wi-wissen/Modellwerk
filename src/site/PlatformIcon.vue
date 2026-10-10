<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <g v-if="name === 'windows'"><path d="M3 5.6 10.3 4.6v6.9H3Zm8.3-1.1L21 3.2v8.3h-9.7ZM3 12.5h7.3v6.9L3 18.4Zm8.3 0H21v8.3l-9.7-1.3Z"/></g>
    <g v-if="name === 'linux'"><path fill-rule="evenodd" d="M12 2.2c-2.6 0-4.3 2.1-4.3 4.9 0 1.2.2 2-.5 3.3-1 1.8-2.6 3.6-2.6 6.4 0 2.6 2.1 4.5 5 4.9.8.1 1.6.1 2.4.1s1.6 0 2.4-.1c2.9-.4 5-2.3 5-4.9 0-2.8-1.6-4.6-2.6-6.4-.7-1.3-.5-2.1-.5-3.3 0-2.8-1.7-4.9-4.3-4.9Zm-2.9 11.7c0-2 1.3-3.3 2.9-3.3s2.9 1.3 2.9 3.3v2.7c0 1.9-1.3 3.2-2.9 3.2s-2.9-1.3-2.9-3.2ZM10.3 6.4a.85.85 0 1 0 0 1.7.85.85 0 0 0 0-1.7Zm3.4 0a.85.85 0 1 0 0 1.7.85.85 0 0 0 0-1.7Zm-3 3.1h2.6L12 10.9Z"/><path d="M6.3 20.4c-.6-.9-.1-1.9 1-1.9h1.6c.9 0 1.2.9.7 1.6l-.7.9c-.6.7-2 .3-2.6-.6Zm11.4 0c.6-.9.1-1.9-1-1.9h-1.6c-.9 0-1.2.9-.7 1.6l.7.9c.6.7 2 .3 2.6-.6Z"/></g>
    <g v-if="name === 'android'"><path fill-rule="evenodd" d="M7.6 4.2a.6.6 0 0 1 .8.2l1.1 1.9a7 7 0 0 1 5 0l1.1-1.9a.6.6 0 1 1 1 .6l-1 1.8A6.4 6.4 0 0 1 18.4 11H5.6a6.4 6.4 0 0 1 2.8-4.2l-1-1.8a.6.6 0 0 1 .2-.8Zm1.9 3.9a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Zm5 0a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z"/><path d="M5.6 12h12.8v6.2c0 .9-.7 1.6-1.6 1.6h-.6v2.1a1.1 1.1 0 0 1-2.2 0v-2.1h-4v2.1a1.1 1.1 0 0 1-2.2 0v-2.1h-.6c-.9 0-1.6-.7-1.6-1.6ZM3.6 12a1.1 1.1 0 0 1 1.1 1.1v4.2a1.1 1.1 0 0 1-2.2 0v-4.2A1.1 1.1 0 0 1 3.6 12Zm16.8 0a1.1 1.1 0 0 1 1.1 1.1v4.2a1.1 1.1 0 0 1-2.2 0v-4.2a1.1 1.1 0 0 1 1.1-1.1Z"/></g>
    <g v-if="name === 'browser'"><path fill-rule="evenodd" d="M4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13A2.5 2.5 0 0 1 4.5 3ZM4 8.5v10c0 .3.2.5.5.5h15c.3 0 .5-.2.5-.5v-10ZM5.6 5a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm2.8 0a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm2.8 0a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z"/><g fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="13.75" r="3.6"/><ellipse cx="12" cy="13.75" rx="1.5" ry="3.6"/><path d="M8.4 13.75h7.2"/></g></g>
  </svg>
</template>

<script>
// Simplified platform marks drawn for this site (Windows flag, penguin, Android robot,
// browser window). Single colour, they take the text colour.
export default {
  name: 'PlatformIcon',
  props: {
    name: { type: String, required: true },
    size: { type: Number, default: 28 },
  },
}
</script>
