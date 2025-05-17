/**
 * @Author: cj
 * @Date: 2025/3/14 上午11:27
 *
 */
import {isObject} from "@mini-vue/shared";
import {ReactivityEffect} from "./effect";
import {unref} from "./ref";

interface Params {
    source: object,
    cb: (newValue, oldValue) => void,
    options: {
        deep: boolean,
        depth: number
    }
}

export function watch(
    source: object,
    cb: (newValue, oldValue) => void,
    options = {deep: false, depth: 1}
) {
    doWatch({source, cb, options})
}

function doWatch(
    {
        source,
        cb,
        options
    }: Params) {
    let {deep, depth} = options
    if (isNaN(Number(depth)) || depth < 1) {
        depth = 1
    }
    if (deep) {
        deep = Number.MAX_VALUE
    }

    let oldValue;
    let newValue;

    const reactiveGetter = (source) => traverse(source, Math.max(depth, deep))

    const getter = () => reactiveGetter(source)

    const scheduler = () => {
        newValue = _effect.run()
        cb(newValue, oldValue)
        oldValue = newValue
    }

    const _effect = new ReactivityEffect(getter, scheduler)
    oldValue = _effect.run()
}


// 后续可能会支持具体支持监控几层, 所以用到了depth
function traverse(source, depth, currentDepth = 0, set = new Set()) {
    if (!isObject(unref(source))) {
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
    for (const key in unref(source)) {
        traverse(unref(source)[key], depth, currentDepth + 1, set)
    }
    return source;
}