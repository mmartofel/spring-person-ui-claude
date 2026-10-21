// Copies the OpenAPI contract from the API repo into contract/openapi.json.
// CONTRACT_SOURCE is a local path or an http(s) URL (e.g. a raw GitHub URL pinned to a tag).
import { readFile, writeFile } from 'node:fs/promises'

const DEFAULT_SOURCE = '../spring-person-api-claude/contract/openapi.json'
const TARGET = 'contract/openapi.json'
const source = process.env.CONTRACT_SOURCE || DEFAULT_SOURCE

async function read(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src)
    if (!res.ok) throw new Error(`GET ${src} failed: ${res.status} ${res.statusText}`)
    return res.text()
  }
  return readFile(src, 'utf8')
}

try {
  const text = await read(source)
  const contract = JSON.parse(text)
  if (!contract.openapi) throw new Error(`${source} is not an OpenAPI document (no "openapi" field)`)
  // Written unchanged so diffs against the API repo stay clean.
  await writeFile(TARGET, text)
  console.log(`Pulled ${contract.info?.title} ${contract.info?.version} from ${source} into ${TARGET}`)
} catch (err) {
  console.error(`contract:pull failed: ${err.message}`)
  process.exit(1)
}
