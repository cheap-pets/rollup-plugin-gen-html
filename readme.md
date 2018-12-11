# rollup-plugin-gen-html

generate html file & inject bundled files



### Installation

```
npm install rollup-plugin-gen-html -D
```

or

```
yarn add rollup-plugin-gen-html --dev
```



### Usage

#### Minimal

it can be zero config to bundle with  `.vue` files.

`rollup.config.js` :

``` js
import html from 'rollup-plugin-gen-html' // this plugin
import postcss from 'rollup-plugin-postcss' // handle .pcss files

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/app.js'
    },
    plugins: [
        html(),
        postcss({ /* postcss plugin options */ })
    ]
}
```

`src/index.js` :

```
import './index.html'  // import as template
import './css/index.pcss' // 
```

`src/index.html`

``` html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Example</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="text/javascript" src="./lib/vue/vue.runtime.js"></script>
  </body>
</html>
```



##### output :

`dist/index.html`

``` html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Example</title>
    <link rel="stylesheet" type="text/css" href="app.css">
  </head>
  <body>
    <div id="app"></div>
    <script type="text/javascript" src="./lib/vue/vue.runtime.min.js"></script>
    <script type="text/javascript" src="app.js"></script>
  </body>
</html>
```



#### options

##### include

* type: `string`
* default: `**/*.html`

files that will be handled



##### exclude

- type: `string`
- default: `undefined`

files that will be ignored



##### template

* type: `string`
* default: `undefined`

Specify a html file, and load the content as template.

If there are html files that import within scripts, this option will be ignored.

in some cases, you need to specify a template by environment variable or arguments, use this option.



##### output

- type: `string`
- default: `undefined`

output path of the html file(s)，related to `cwd`.

If has a single html file, it can be a file path, otherwise it should be a directory.



##### hash

- type: `string | boolean`
- default: `false`

Put a md5 value of the bundle file, or use the specify string value, as part of the bundle filenames.

Then, the output html file looks like:

`dist/index.html`

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Example</title>
    <link rel="stylesheet" type="text/css" href="app.2234a93729a0e7115216f9a5d55f93c4.css">
  </head>
  <body>
    <div id="app"></div>
    <script type="text/javascript" src="./lib/vue/vue.runtime.min.js"></script>
    <script type="text/javascript" src="app.b572d3ac186ca60072b05e7892848a73.js"></script>
  </body>
</html>
```



##### replaceToMinScripts

- type: `boolean`
- default: `true`

Auto replace script src to `*.min.js` , if exist.



##### insertCssRef

- type: `boolean`
- default: `true`

Insert `css` file ref into html content, if exist.





