/**
 * @Author: cj
 * @Date: 2025/2/12 16:23
 *
 */
import {toReactive} from "./reactivity";
import {createKeyDepsMap, executeTrackEffect, track, trigger} from "./reactiveEffect";
import {activeEffect, ReactivityEffect, trackEffect} from "./effect";
import {isObject} from "@mini-vue/shared";
import {ComputedRefImpl} from "./computed";
import {ReactivityFlags} from "./constant";

export function ref(value: any) {
    return createRef(value, false)
}

function createRef(value: any, shallow: boolean) {
    return new RefImpl(value, shallow)
}

class RefImpl {
    private readonly [ReactivityFlags.IS_REF] = true

    private _rawValue: any

    private _value: any

    private _shallow: boolean

    // 这里的deps是一个map; 对于ref和computed来说, 都是一个map
    // 与reactive有所不同, 这里的_deps相当于其proxy中调用的track方法中的keyDepsMap,
    // reactive本身并没有这样的一个map属性, 而是存在外部的, 因为reactive没有用get和set,用的proxy
    // 而ref和computed是用get和set的; // 从实现来看ref和computed更像; 而reactive单独的;  // 当然不同版本应该不一样
    public _deps: Map<ReactivityEffect, number> | undefined;

    constructor(rawValue: any, shallow: boolean) {
        this._rawValue = rawValue
        this._value = toReactive(rawValue)
        this._shallow = shallow
    }

    get value() {
        trackRefValue(this,'ref_value')
        return this._value
    }

    set value(newValue: any) {
        if (!Object.is(newValue, this._rawValue)) {
            this._rawValue = newValue
            // todo 要不要包toReactive,有影响没

            // this._value = newValue
            this._value = toReactive(newValue)
            triggerRefValue(this)
        }
    }
}


// depsName: 临时加个参数,方便调试
export function trackRefValue(ref: RefImpl | ComputedRefImpl,depsName?:string) {
    if (!activeEffect) return

    ref._deps ??= createKeyDepsMap(depsName||'_value', () => {
        ref._deps = undefined
    })
    trackEffect(activeEffect, ref._deps)
}

export function triggerRefValue(ref: RefImpl | ComputedRefImpl) {
    const deps = ref._deps
    if (!deps) return
    executeTrackEffect(deps)
}


// 有两个成员变量是为了能够和数据源双向关联,
// 即toRef之后,ref改变原来的reactive内的值也改变,反之成立; 因为是引用
class ObjectRefImpl {

    private readonly [ReactivityFlags.IS_REF] = true

    private readonly _object: any

    private readonly _key: string | symbol

    constructor(object: any, key: string | symbol) {
        this._object = object
        this._key = key
    }

    get value() {
        return this._object[this._key]
    }

    set value(val: any) {
        this._object[this._key] = val
    }
}

export function toRef(target: object, key: string | symbol) {
    return new ObjectRefImpl(target, key)
}

export function toRefs(target: object) {
    const res = {}
    Object.keys(target).forEach(key => {
        res[key] = toRef(target, key)
    })
    return res
}

// 代理ref,不用手动`.value`,主要是在模版使用ref的时候,将用到的ref进行转换

// temp: 好像只代理一层?
export function proxyRefs(target: object) {
    return new Proxy(target, {
        get(target, key, receiver) {
            return unref(Reflect.get(target, key, receiver))
        },
        set(target: object, key: string | symbol, newValue: any, receiver: any): any {
            const oldValue = target[key]
            if (isRef(oldValue) && !isRef(newValue)) {
                oldValue.value = newValue
                return true;
            } else {
                return Reflect.set(target, key, newValue, receiver);
            }
        }
    })
}

export function isRef(target: any) {
    if (!isObject(target)) return false
    return Boolean(target[ReactivityFlags.IS_REF])
}

export function unref(ref: any) {
    return isRef(ref) ? ref.value : ref;
}



