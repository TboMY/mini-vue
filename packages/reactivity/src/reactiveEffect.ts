/**
 * @Author: cj
 * @Date: 2025/1/22 01:03
 * 用于收集reactive和effect的依赖关系
 */
import {activeEffect, createRealDeps, ReactivityEffect} from "./effect";

// 用来收集依赖关系
// 要形成这样的数据结构:
// {
//     targetObj1:{
//         // 这里原本用的一个set,3.4后变成map了, 因为要用_trackId
// 用Map不用Set是有其他原因的:
// todo: 原因:
//         prop1:{
//             effect1: _trackId,
//             effect2: _trackId
//         },
//         prop2:{
//             effect3: _trackId
//         }
//     }
// }


export const effectDeps = new WeakMap<object, Map<symbol | string, Map<ReactivityEffect, number>>>()

// 追踪, 每次访问的时候,通过proxy来构建依赖关系
export function track(target: object, key: string | symbol) {

    // 如果activeEffect有值,才说明是effect中的回调访问响应式数据,导致触发handler,才需要收集;
    // 其他地方访问响应式数据触发的get,set等不用收集
    if (!activeEffect) return

    // 获取这个state响应式数据的depMap
    let depTarget = effectDeps.get(target)
    // console.log('执行track,key= ', key)
    // console.log(depTarget)
    if (!depTarget) {
        depTarget = new Map<symbol | string, Map<ReactivityEffect, number>>()
        effectDeps.set(target, depTarget)
    }

    // 获取state的某个key的depMap
    let keyDepsMap = depTarget.get(key);
    if (!keyDepsMap) {
        keyDepsMap = createKeyDepsMap(key, () => {
            depTarget.delete(key)
        })
        depTarget.set(key, keyDepsMap)
    }

    // 真正建立effect和state的关系
    createRealDeps(activeEffect, keyDepsMap)
}


export function trigger(target: object, key: string | symbol, newValue: any, oldValue: any) {
    executeTrackEffect(target, key)
}

// 当handler中的set执行,要执行一遍依赖了该state的effect的run
export function executeTrackEffect(target: object, key: symbol | string) {
    const depTarget = effectDeps.get(target);
    if (!depTarget) return;

    const keyDepsMap = depTarget.get(key);
    if (!keyDepsMap) return;

    keyDepsMap.entries().forEach(([_effect, v]) => {
        // 执行调度函数
        _effect?.scheduler?.()
    })
}

function createKeyDepsMap(key: string | symbol, cleanUp: Function) {
    const dep = new Map() as any
    dep.cleanUp = cleanUp
    dep.key = key
    return dep
}

// /**
//  * 在每次activateEffect变化时,用于清除state和_effect之间的关联,
//  * 比如: 之前effect的回调中涉及到stateA,后面没涉及了,就要清除掉了
//  */
// export function preCleanEffectDeps(_effect: ReactivityEffect) {
//     // 记录的时候是双向关联了的,这里获取老的关联
//     const deps = _effect.deps;
//     for (const target of deps) {
//         const depTarget = effectDeps.get(target);
//         if (!depTarget) {
//             // 删除在_effect中, 这个过时的target
//
//             continue
//         }
//
//         // 获取老的keys
//         const oldKeys = Object.keys(target);
//         for (const oldKey of oldKeys) {
//             if (!depTarget.get(oldKey)){
//                 // 删除数组中这个target
//                 // deps.find(item=>item===target)
//
//             }
//         }
//     }
//
// }