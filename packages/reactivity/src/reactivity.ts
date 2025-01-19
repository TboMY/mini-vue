/**
 * @Author: cj
 * @Date: 2025/1/19 17:10
 *
 */

import {isObject} from '@mini-vue/shared/src/index.ts'
import {ReactivityFlags} from "./constant";
import {effect} from "./effect";

// 弱引用,防止内存泄漏
const reactivityMemo = new WeakMap<object, any>()

// 代理对象的handlers
const proxyHandlers = {
    get(target: any, p: string | symbol, receiver: any): any {
        if (p === ReactivityFlags.IS_REACTED) {
            return true
        }
        return Reflect.get(...arguments)
    },
    set(target: any, p: string | symbol, newValue: any, receiver: any): boolean {
        effect()
        return true
    }
}

export function reactive(target) {
    return createReactiveObject(target)
}

function createReactiveObject(target) {
    if (!isObject(target)) {
        return target
    }
    // 代理过这个目标对象
    const memo = reactivityMemo.get(target);
    if (memo) {
        return memo
    }

    // 传入的是一个已经是响应式的对象
    const isReacted = target[ReactivityFlags.IS_REACTED]
    if (isReacted) {
        return target;
    }

    const reactivity = new Proxy(target, proxyHandlers)
    reactivityMemo.set(target, reactivity)
    return reactivity
}