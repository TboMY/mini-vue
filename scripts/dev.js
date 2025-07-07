/**
 * @Author: cj
 * @Date: 2025/1/12 23:50
 * 打包模块成js文件
 */

// minimist是一个用于解析node执行参数的库
import minimist from 'minimist'

import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createRequire } from "module";
import * as esbuild from 'esbuild'

// 获取执行命令式的参数(舍去前两个参数) node dev.mjs reactivity -f iife
const params = minimist(process.argv.slice(2))
console.log('params', params)//{ _: [ 'reactivity' ], f: 'esm' }

// 获取打包的模块名称
const moduleName = params._[0] || 'reactivity'

// 获取打包的模块格式
const format = params.f || 'iife'// iife是立即执行函数

// esm模块,没有__dirname, __filename
// 获取模块index路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const entry = resolve(__dirname, `../packages/${ moduleName }/src/index.ts`)

// commandjs可以直接引入json文件, 在esm中就要用点其他方式
// import { createRequire } from "module";
// const require = createRequire(import.meta.url);
// const data = require("./data.json");

const packagePath = resolve(__dirname, `../packages/${ moduleName }/package.json`)
console.log('packagePath', packagePath)
// 这里是因为import只能支持(Url,file:, data),不支持直接的绝对路径,比如`D:/xxxx`, 这里转成Url
// const packageJson = (await import(pathToFileURL(packagePath), { assert: { type: 'json' } })).default
const packageJson = (await import(`../packages/${ moduleName }/package.json`, { assert: { type: 'json' } })).default

// 用esbuild打包
esbuild.context({
  // 入口文件
  entryPoints: [entry],
  // 出口文件
  outfile: resolve(__dirname,
    `../packages/${ moduleName }/dist/${ moduleName }.js`),
  // true相当于maven的compile; false相当于provided
  // 并且如果true,会将依赖都赛到同一个文件
  bundle: true,
  sourcemap: true,
  // cjs, esm, iife
  format: format,
  // 打包之后,给浏览器用
  platform: 'browser',
  //如果为iife,则需要指定全局变量名称
  globalName: packageJson.buildOptions?.name || moduleName
}).then(ctx=>{
  console.log('========开始=========')
  return ctx.watch()
})







