/**
 * @Author: cj
 * @Date: 2025/1/19 17:10
 *
 */

import {isObject} from '@mini-vue/shared'
import {ReactivityFlags} from "./constant";
import {track, trigger} from "./reactiveEffect";

// 缓存已经reactive过的object, 弱引用,防止内存泄漏
const reactivityMemo = new WeakMap<object, ProxyConstructor>()

// 代理对象的handlers
const proxyHandlers = {
    get(target: any, key: string | symbol, receiver: any): any {
        if (key === ReactivityFlags.IS_REACTED) {
            return true
        }
        // console.log('getHandlers,key= ', key)
        track(target, key)

        // 递归代理, 懒代理
        // 并且reactive中有缓存, 性能不会有问题
        const res = Reflect.get(target, key, receiver);
        if (isObject(res)) {
            return reactive(res)
        }
        return res
    },
    set(target: any, key: string | symbol, newValue: any, receiver: any): boolean {
        const oldValue = target[key]
        Reflect.set(target, key, newValue, receiver)
        if (Object.is(newValue, oldValue)) {
            return true
        }

        // 执行追踪的_effect的调度函数
        trigger(target, key, newValue, oldValue)
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

export function toReactive(target: any) {
    return createReactiveObject(target)
}

export function isReactive(target: object){
    return target && target[ReactivityFlags.IS_REACTED]
}