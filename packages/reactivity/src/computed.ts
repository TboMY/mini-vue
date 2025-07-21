/**
 * @Author: cj
 * @Date: 2025/2/13 14:24
 *
 */
import {isFunction} from "@mini-vue/shared";
import { ReactivityEffect,} from "./effect";
import {trackRefValue, triggerRefValue} from "./ref";
import {ReactivityFlags} from "@mini-vue/shared";

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
    private readonly [ReactivityFlags.IS_REF] = true

    /*
    具体流程:
        1. effect内的回调函数用到了computed, 然后触发了getter, 这个时候getter内用到了reactive(或ref), 然后通过track或者trackRefValue收集依赖;
        2. computed中的用_deps, 也用trackRefValue方法, 收集了最外面的_effect;(即对应用了computed的这个回调函数)
        3. computed中用到的ref或reactive变化了, 触发executeTrackEffect, 然后触发computed中的_effect的scheduler;
        4. computed中_effect的scheduler调用了triggerRefValue, 在这个方法中, 用computed的_deps, 将用到了computed的所有_effect的run方法执行一遍(即执行最开始的回调函数);
        5. 回调函数执行的时候,用到了computed,即又从1开始了;
     */
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
            // 回调函数fn(computed中的getter有一个形参,可以接受原来的老值)
            () => getter(this._value),
            // 调度函数
            () => {
                // 依赖的reactive数据变化了, 重新渲染
                // 不在set里面调用triggerRefValue, 因为getter里面访问了reactive数据,然后=>proxy=>track()=>reactive数据被修改=>trigger()=>scheduler()
                // 本质是因为react数据被修改了才引起的调度函数执行,而不是因为set了computed;  在set里面可能会修改react数据,也可能不修改;
                triggerRefValue(this)
            })

        // 这里为了debugger, 加个方便辨认的参数
        // @ts-ignore
        this._effect.name = 'computed'
    }

    get value() {
        // 默认是脏的,所以初次会执行
        if (this._effect.dirty) {
            // debugger
            this._value = this._effect.run()
        }
        // 不能写在if内, 如果第一次没有在effect内访问, 导致dirty变为false了,
        // 然后再在effect内访问, 此时就不会收集computed的getter中用的reactive数据的依赖了, reactive与computed._effect就没有关系了
        trackRefValue(this,'computed_value')
        return this._value
    }

    set value(v) {
        this._setter(v)
    }
}

