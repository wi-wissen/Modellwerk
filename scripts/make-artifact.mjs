// Wandelt dist-single/index.html in eine Artefakt-Seite um (ohne doctype/html/head/body).
import { readFileSync, writeFileSync } from 'node:fs'
const [, , input = 'dist-single/index.html', output = 'dist-single/artifact.html'] = process.argv
const html = readFileSync(input, 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/i)[1]
const body = html.match(/<body>([\s\S]*?)<\/body>/i)[1]
const keep = [
  ...head.matchAll(/<title>[\s\S]*?<\/title>|<link rel="(?:preconnect|stylesheet)"[^>]*>|<style[\s\S]*?<\/style>/gi),
].map((m) => m[0])
const scripts = [...head.matchAll(/<script[\s\S]*?<\/script>/gi)].map((m) => m[0])
writeFileSync(output, [...keep, body.trim(), ...scripts].join('\n'))
console.log(`${output}: ${(readFileSync(output).length / 1024).toFixed(0)} kB`)
