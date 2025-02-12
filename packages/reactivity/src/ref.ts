/**
 * @Author: cj
 * @Date: 2025/2/12 16:23
 *
 */
import {toReactive} from "./reactivity";
import {createKeyDepsMap, executeTrackEffect, track, trigger} from "./reactiveEffect";
import {activeEffect, ReactivityEffect, trackEffect} from "./effect";
import {isObject} from "@mini-vue/shared";

export function ref(value: any) {
    return createRef(value, false)
}

function createRef(value: any, shallow: boolean) {
    return new RefImpl(value, shallow)
}

class RefImpl {
    private readonly __v_isRef = true

    private _rawValue: any

    private _value: any

    private _shallow: boolean

    public _deps: Map<ReactivityEffect, number> | undefined;

    constructor(rawValue: any, shallow: boolean) {
        this._rawValue = rawValue
        this._value = toReactive(rawValue)
        this._shallow = shallow
    }

    get value() {
        trackRefValue(this)
        return this._value
    }

    set value(newValue: any) {
        if (!Object.is(newValue, this._rawValue)) {
            this._rawValue = newValue
            this._value = newValue
            // this._value = toReactive(newValue)
            triggerRefValue(this)
        }
    }
}


function trackRefValue(ref: RefImpl) {
    if (!activeEffect) return

    ref._deps ??= createKeyDepsMap('_value', () => {
        ref._deps = undefined
    })
    trackEffect(activeEffect, ref._deps)
}

function triggerRefValue(ref: RefImpl) {
    const deps = ref._deps
    if (!deps) return
    executeTrackEffect(deps)
}


// 有两个成员变量是为了能够和数据源双向关联,
// 即toRef之后,ref改变原来的reactive内的值也改变,反之成立; 因为是引用
class ObjectRefImpl {

    private readonly __v_isRef = true

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
    return Boolean(target['__v_isRef'])
}

export function unref(ref: any) {
    return isRef(ref) ? ref.value : ref;
}



