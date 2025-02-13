/**
 * @Author: cj
 * @Date: 2025/2/13 14:24
 *
 */
import {isFunction} from "@mini-vue/shared";
import { ReactivityEffect,} from "./effect";
import {trackRefValue, triggerRefValue} from "./ref";

type ComputedOptions = {
    get: Function,
    set: Function
}

export function computed(getterOrOptions: Function | ComputedOptions) {
    let getter: any;
    let setter: any;

    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions
        setter = () => {
        }
    } else {
        const {get, set} = (getterOrOptions as ComputedOptions)
        getter = get
        setter = set
    }
    return new ComputedRefImpl(getter, setter)
}

export class ComputedRefImpl {
    private readonly __v_isRef = true

    // ReactivityEffect实例,
    // 最初相当于effect的回调函数和ReactivityEffect实例关联; 因为回调函数内用到了reactive,然后触发proxy,然后收集依赖,然后reactive变化重新执行effect的回调函数
    // 这里相当于computed内,也是回调函数(getter),用到了reactive,然后触发proxy,然后收集依赖,然后然后reactive变化重新执行getter;
    private _effect: ReactivityEffect

    // 缓存的值
    private _value: any

    public _deps: Map<ReactivityEffect, number> | undefined;

    private _getter: Function

    private readonly _setter: Function

    constructor(getter: Function, setter: Function) {
        this._getter = getter
        this._setter = setter
        this._effect = new ReactivityEffect(
            // 回调函数fn
            () => getter(this._value),
            // 调度函数
            () => {
                // 依赖的reactive数据变化了, 重新渲染
                // 不在set里面调用triggerRefValue, 因为getter里面访问了reactive数据,然后=>proxy=>track()=>reactive数据被修改=>trigger()=>scheduler()
                // 本质是因为react数据被修改了才引起的调度函数执行,而不是因为set了computed;  在set里面可能会修改react数据,也可能不修改;
                triggerRefValue(this)
            })
    }

    get value() {
        // 默认是脏的,所以初次会执行
        if (this._effect.dirty) {
            this._value = this._effect.run()
        }
        // 不能写在if内, 如果第一次没有在effect内访问, 导致dirty变为false了,
        // 然后再在effect内访问, 此时就不会收集这个effect回调产生的_effect实例与这个computed之间的依赖了
        trackRefValue(this,'computed_value')
        return this._value
    }

    set value(v) {
        this._setter(v)
    }
}

