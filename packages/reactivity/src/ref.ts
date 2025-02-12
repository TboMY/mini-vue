/**
 * @Author: cj
 * @Date: 2025/2/12 16:23
 *
 */
import {toReactive} from "./reactivity";
import {createKeyDepsMap, executeTrackEffect, track, trigger} from "./reactiveEffect";
import {activeEffect, trackEffect} from "./effect";

export function ref(value: any) {
    return createRef(value, false)
}

function createRef(value: any, shallow: boolean) {
    return new RefImpl(value, shallow)
}

class RefImpl {

    private _rawValue: any

    private _value: any

    private _shallow: boolean

    public _deps;

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
            this._value = toReactive(newValue)
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
