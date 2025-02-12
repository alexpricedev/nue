import { execSync } from 'node:child_process'
import { promises as fs, existsSync } from 'node:fs'
import { join } from 'node:path'

import { openUrl } from './util.js'
import { createKit } from './nuekit.js'

const templates = {
  'simple-blog': 'welcome/',
  'blank': '',
}


async function serve(args) {
  const nue = await createKit(args)
  const terminate = await nue.serve()

  // open welcome page
  if (!args.debug) openUrl(`http://localhost:${nue.port}/${templates[args.name]}`)
  return terminate
}

export async function create(args = {}) {
  if (!args.name) args.name = 'simple-blog'
  if (!args.root) args.root = args.name

  // debug mode with: `nue create test`
  args.debug = args.name == 'test'
  if (args.debug) args.name = 'simple-blog'

  const { debug, name, root } = args

  // check if template exists
  if (!Object.keys(templates).includes(name)){
    console.error(`Template "${name}" does not exist!`)
    console.error('Available templates:')
    for (const t of Object.keys(templates)) console.error(' -', t)
    return
  }

  if (existsSync(root)) {
    // read files
    const files = (await fs.readdir(root)).filter(f => !f.startsWith('.'))

    // already created -> serve
    if (files.includes('site.yaml')) return serve(args)

    // must be empty directory
    if (files.length) return console.error('Please create the template to an empty directory')
  } else await fs.mkdir(root, { recursive: true })

  // download archive
  console.info('Loading template...')
  const archive_name = join(root, `${name}-source.tar.gz`)
  const archive_web = `https://${name}.nuejs.org/${debug ? 'test' : 'source'}.tar.gz`
  const archive = await fetch(archive_web)

  // catch download issues
  if (archive.status != 200) return console.error(`Downloading template "${archive_web}" failed with "${archive.statusText}".`)
  await fs.writeFile(archive_name, Buffer.from(await archive.arrayBuffer()))

  // uncompress
  execSync(`tar -C ${root} --strip-components 1 -xf ${archive_name}`)

  // remove archive
  await fs.rm(archive_name)

  // serve
  return await serve(args)
}
