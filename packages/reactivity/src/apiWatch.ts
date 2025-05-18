/**
 * @Author: cj
 * @Date: 2025/3/14 上午11:27
 *
 */
import {isFunction, isObject} from "@mini-vue/shared";
import {ReactivityEffect} from "./effect";
import {isRef} from "./ref";
import {isReactive} from "./reactivity";


interface Options {
    deep: boolean,
    depth: number,
    immediate: boolean
}

interface Params {
    source: object,
    cb?: (newValue, oldValue, onCleanup) => void,
    options: Options
}

export function watch(
    source: object,
    cb: (newValue, oldValue) => void,
    options: Options
): Function {
    return doWatch({source, cb, options})
}

// 其实watchEffect()和effect()基本一模一样; 都是传入一个fn, 自动搜集依赖, 依赖更新再重新执行;
// 不过有options的区别
export function watchEffect(fn: (onCleanup) => void, options: Options): Function {
    return doWatch({source: fn, cb: null, options})
}

function doWatch(
    {
        source,
        cb,
        options = {}
    }: Params) {
    let {deep, depth, immediate} = options
    if (isNaN(Number(depth)) || depth < 1) {
        depth = 1
    }
    if (deep) {
        deep = Number.MAX_VALUE
    }

    let oldValue;
    let newValue;

    const reactiveGetter = (source) => traverse(source, Math.max(depth, deep))

    let getter = () => {
    }
    // 是响应式才有意义, 才需要遍历key来手机依赖
    // 并且,
    // 对于reactive对象, 默认支持一层属性监听
    // 对于ref, 只支持ref.value被直接改变; 如果ref.value是对象, 对象的key被改变,不会触发回调
    // 对于getter函数, 取决于函数内怎么访问的(其实就是effect中的回调函数fn)
    if (isReactive(source) || isRef(source)) {
        getter = () => reactiveGetter(source)
    } else if (isRef(source)) {
        getter = source.value
    } else if (isFunction(source)) {
        getter = source
    }


    let clean;
    const onCleanup = (fn: Function) => {
        clean = () => {
            fn && fn()
            clean = undefined
        }
    }

    const scheduler = () => {
        // debugger
        if (clean) {
            clean()
        }

        // 其实就是watchEffect
        if (!cb) {
            _effect.run()
            return
        }
        newValue = _effect.run()
        cb(newValue, oldValue, onCleanup)
        oldValue = newValue
    }

    // 这里要让这个_effect和reactive的key建立双向绑定的关系,
    // 所以要使用_effect.run()而不能直接getter(); 包括scheduler里面也是这个原因
    // 要在run方法中, 切换activeEffect为当前_effect
    const _effect = new ReactivityEffect(getter, scheduler)

    // 没有cb其实就是watchEffect
    if (cb) {
        // 如果需要立即执行
        if (immediate) {
            scheduler()
        } else {
            oldValue = _effect.run()
        }
    } else {
        // 如果是watch, 则立即执行的getter,
        // 如果是watchEffect, 则立即执行的是传入的fn
        // 同时兼顾了watch的immediate和watchEffect
        _effect.run()
    }

    // 返回unWatcher
    return () => {
        _effect.stop()
    }
}


// 后续可能会支持具体支持监控几层, 所以用到了depth
function traverse(source, depth, currentDepth = 0, set = new Set()) {
    if (!isObject(source)) {
        return source
    }

    if (currentDepth >= depth) {
        return source
    }

    // 防止对象自引用导致无线递归
    if (set.has(source)) {
        return source
    }

    set.add(source)
    for (const key in source) {
        traverse(source[key], depth, currentDepth + 1, set)
    }
    return source;
}