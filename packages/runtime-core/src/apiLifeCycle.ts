/**
 * @Author: cj
 * @Date: 2025/8/7 15:43
 *
 */
import {getCurrentInstance, setCurrentInstance, unsetCurrentInstance} from "./component";
import {isArr} from "@mini-vue/shared";

export const enum LifeCycle {
    BeforeMounted = 'bm',
    Mounted = 'm',
    BeforeUpdate = 'bu',
    Updated = 'u',
    BeforeUnmount = 'bum',
    Unmount = 'um',
}


function createHook(type: LifeCycle) {
    return function (callback: Function, target = getCurrentInstance()) {
        // 只能组件中使用
        if (!target) return

        const callbacks = target[type] || (target[type] = [])
        const wrapCallback = () => {
            setCurrentInstance(target)
            callback.call(target)
            unsetCurrentInstance()
        }
        callbacks.push(wrapCallback)
    }
}

export const onBeforeMount = createHook(LifeCycle.BeforeMounted)
export const onMounted = createHook(LifeCycle.Mounted)
export const onBeforeUpdate = createHook(LifeCycle.BeforeUpdate)
export const onUpdated = createHook(LifeCycle.Updated)
export const onBeforeUnmount = createHook(LifeCycle.BeforeUnmount)
export const onUnmounted = createHook(LifeCycle.Unmount)

export const invokeFnArray = (arr: Function[]) => {
    if (!isArr(arr)) return
    for (let i = 0; i < arr.length; i++) {
        const fn = arr[i]
        fn && fn()
    }
}

export const executeLifeHook = (instance, type) => {
    if (!instance || !type) return
    const life = instance[type]
    life && invokeFnArray(life)
}

