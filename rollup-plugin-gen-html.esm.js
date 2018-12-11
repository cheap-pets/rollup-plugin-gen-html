import { resolve, parse, join, dirname, basename, extname, relative } from 'path'
import { existsSync, readFileSync, writeFileSync, unlinkSync, renameSync } from 'fs'
import { createFilter } from 'rollup-pluginutils'
import cheerio from 'cheerio'
import hasha from 'hasha'

export default (options = {}) => {
  const {
    include,
    exclude,
    template,
    output,
    hash,
    replaceToMinScripts,
    insertCssRef = true,
    cwd = process.cwd()
  } = options
  const filter = createFilter(include || ['**/*.html'], exclude)
  const html = []
  const hashedFiles = {}

  function _insertRef ({ $, ref, htmlFile }) {
    if (!existsSync(ref)) return
    const dir = dirname(htmlFile)
    if (extname(ref) === '.js') {
      $('<script type="text/javascript"></script>')
        .attr('src', relative(dir, ref))
        .appendTo($('body'))
    } else {
      $('<link rel="stylesheet" type="text/css"></link>')
        .attr('href', relative(dir, ref))
        .appendTo($('head'))
    }
  }

  function _replaceToMinScripts ($, htmlFile) {
    $('script').each((idx, elm) => {
      const htmlDir = dirname(htmlFile)
      const p = parse(elm.attribs.src)
      const scriptFile = resolve(htmlDir, p.dir, p.name + '.min' + p.ext)
      if (existsSync(scriptFile)) elm.attribs.src = relative(htmlDir, scriptFile)
    })
  }

  function _writeHtml ({ scriptDir, scriptFile, scriptHash, cssFile, cssHash, input, output, code }) {
    output = resolve(cwd, output || scriptDir)
    if (!extname(output)) output = resolve(output, basename(input))
    const $ = cheerio.load(code, { decodeEntities: false })
    if (replaceToMinScripts) _replaceToMinScripts($, output)
    scriptFile && _insertRef({
      $,
      ref: scriptFile,
      htmlFile: output
    })
    cssFile && _insertRef({
      $,
      ref: cssFile,
      htmlFile: output
    })
    code = $.html()
    for (let s in options.replaces) {
      let v = options.replaces[s]
      code = code.replace(s, v)
    }
    writeFileSync(output, code)
    return true
  }

  function _renameWithHash (oldName, hash) {
    const { dir, name, ext } = parse(oldName)
    const newName = join(dir, name + '.' + hash + ext)
    existsSync(newName) && unlinkSync(newName)
    renameSync(oldName, newName)
    return newName
  }

  function _removeOldHashedFiles (id) {
    const file = hashedFiles[id]
    file && existsSync(file) && unlinkSync(file)
  }

  return {
    name: 'html',
    buildStart () {
      html.length = 0
    },
    transform (code, id) {
      if (filter(id)) {
        html.push({ id, code })
        return ''
      }
    },
    onwrite (options, data) {
      let scriptFile = resolve(options.file)
      _removeOldHashedFiles(scriptFile)
      const p = parse(scriptFile)
      if (existsSync(scriptFile)) {
        const scriptHash = hash === true
          ? hasha(data.code, { algorithm: 'md5' })
          : hash
        if (scriptHash) {
          hashedFiles[scriptFile] = scriptFile = _renameWithHash(scriptFile, scriptHash)
        }
      }
      let cssFile
      const scriptDir = p.dir
      if (insertCssRef) {
        cssFile = resolve(join(p.dir, p.name + '.css'))
        _removeOldHashedFiles(cssFile)
        if (existsSync(cssFile)) {
          const cssHash = hash === true
            ? hasha(readFileSync(cssFile).toString(), { algorithm: 'md5' })
            : hash
          if (cssHash) {
            hashedFiles[cssFile] = cssFile = _renameWithHash(cssFile, cssHash)
          }
        } else cssFile = undefined
      }
      if (html.length) {
        const outputPath = (html.length > 1 && output && extname(output)) ? dirname(output) : output
        html.every(({ id, code }) => _writeHtml({
          scriptDir,
          scriptFile,
          cssFile,
          input: id,
          output: outputPath,
          code
        }))
      } else if (template) {
        const input = resolve(cwd, template)
        if (existsSync(input)) {
          const code = readFileSync(input).toString()
          _writeHtml({
            scriptDir,
            scriptFile,
            cssFile,
            input,
            output,
            code
          })
        }
      }
    }
  }
}
