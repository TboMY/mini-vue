/**
 * @Author: cj
 * @Date: 2025/5/24 下午11:02
 *
 */

// 因为其实最后用的vue.js 就是这个runtime-dom模块

// runtime-dom 模块，主要是负责提供操作dom的api，（类似jq）
export * from '@mini-vue/shared'
export * from '@mini-vue/shared'
export * from "@mini-vue/runtime-core"

import {nodeOps} from "./nodeOps";
import {patchProp} from "./patchProps";
import {createRenderer} from "@mini-vue/runtime-core"

// 形成一个options对象, patchProps是用于处理dom的属性的, 比较复杂单独处理, 但也是属于options
const createRendererOptions = Object.assign({patchProp}, nodeOps)

const render = createRenderer(createRendererOptions)



