/**
 * @Author: cj
 * @Date: 2025/1/19 17:13
 *
 */
import {DirtyLevel} from "./constant";

export let activeEffect: any;

export function effect(callback: Function, options?: any) {

    const _effect = new ReactivityEffect(callback, () => {
        _effect.run()
    })
    // 第一次执行一次
    _effect.run()

    // 用户自定义的调度函数,在reactive发生变化后,可能不需要立即渲染ui,或者可以待会用户自己渲染ui(会提供给用户)
    // aop的思想
    if (options) {
        Object.assign(_effect, options)
    }
    const runner = _effect.run.bind(_effect)
    runner.effect = _effect
    return runner
}

export class ReactivityEffect {
    // 是否是响应式的effect, 某些state在第一次执行,后续state变化,不会触发effect的回调
    private _isReactive = true

    // 收集依赖后,effect的回调执行一次,就加一次
    public _trackId = 0

    // 双向依赖, state <==> _effect
    public _deps = Array<Map<ReactivityEffect, number>>()

    // 主要作用是一个指针, 在清理依赖关系的时候用
    // 用来遍历_deps中的state
    public _depsLength = 0

    // 不为0时,表示effect正在执行中, 防止在effect中既访问又修改reactive属性的值时,导致像react的useEffect中,栈溢出
    public _running = 0

    // 如果noDirty表示数据不为脏数据(即是effect中使用的是最新的,不用执行run方法),
    // 否则需要执行run方法,获取最新值
    private _dirtyLevel = DirtyLevel.Dirty

    public get dirty() {
        return this._dirtyLevel > DirtyLevel.NotDirty
    }

    public set dirty(v) {
        v ? this._dirtyLevel = DirtyLevel.Dirty : this._dirtyLevel = DirtyLevel.NotDirty
    }

    /**
     *
     * @param fn effect中的回调
     * @param scheduler 调度回调函数,在响应式数据发生变化后,执行改回调函数
     */
    constructor(public fn: Function, public scheduler: Function) {
        // ts中,在构造函数的形参前面加上了public,表示作为实例的属性,自动赋值了
        // this.fn = fn
        // this.schedule = schedule
    }

    run() {
        this._dirtyLevel = DirtyLevel.NotDirty
        if (!this._isReactive) {
            return this.run()
        }

        const lastActiveEffect = activeEffect
        try {
            // 在proxy中的handler中用到
            activeEffect = this
            preCleanEffectDeps(this)
            this._running++
            return this.fn()
        } finally {
            this._running--
            // 当且仅当, 由effect中的回调函数引起代理的触发,才能够在handler中,用到_effect;
            // 由其他地方引起的proxy的handler触发,不能用到_effect
            activeEffect = lastActiveEffect //应对effect嵌套的时候,(其实就是一个栈,内层的effect回调执行后,触发handler之后,finally要回到外层的activeEffect去)
            postCleanEffect(this)
        }
    }
}

// 每次重新执行effect()内的回调函数之前, 先清理之前的state,
// 因为回调函数内对state的访问可能变了,(比如三目运算, || &&等)
function preCleanEffectDeps(_effect: ReactivityEffect) {
    _effect._trackId++;
    _effect._depsLength = 0;
}

// 删除keyDepsMap中旧的_effect-_trackId 键值对
function cleanDepsEffect(keyDepsMap: Map<ReactivityEffect, number>, _effect: ReactivityEffect) {
    keyDepsMap.delete(_effect);
    if (keyDepsMap.size == 0) {
        // 如果map为空，则从reactiveState中删除这个属性
        (keyDepsMap as any).cleanUp();
    }
}

// 回调函数中依赖的reactive的数量变少了, 删除多余的
// 比如 {flag, name, age} => {flag}; 就要将name,age这两个删除
function postCleanEffect(_effect: ReactivityEffect) {
    const depsLength = _effect._depsLength;
    const deps = _effect._deps;
    if (depsLength <= deps.length) return

    for (let i = depsLength; i < deps.length; i++) {
        const keyDepsMap = deps[i];
        keyDepsMap.delete(_effect)
    }
    // 让deps回到正确长度
    deps.length = depsLength
}

export function trackEffect(_effect: ReactivityEffect, deps: Map<ReactivityEffect, number>) {
    // 这个map是state.key对应的map, 该map中每个key表示一个_effect对象,其value表示一个_trackId
    /*
       state: {
            key1:{
                _effect1: 1,
                _effect2: 3
            }
       }
     */

    // 每个effect的回调run一次_trackId才会自增一次
    // 并且要防止多次访问一个state时,重复收集
    if (deps.get(_effect) !== _effect._trackId) {
        deps.set(_effect, _effect._trackId)
        /*
         比如 原来是 {name,age}
             现在是 {age,name} 暂时并不会复用的,
             暂时只是 一个一个遍历过来, 一一比对,相等就跳过, 不相等就简单的删除旧的,添加新的(keyDepsMap中删除, deps数组中直接覆盖)
         */
        const oldValue = _effect._deps[_effect._depsLength];
        if (oldValue !== deps) {
            // 如果oldValue是undefined是新增,不然的话
            // 说明遍历过来, 老的和旧的已经对应不上了, 要删除keyDepsMap中的这个_effect
            if (oldValue) {
                cleanDepsEffect(deps, _effect)
            }

            // 双向,各自保存一份依赖
            // 一个_effect关联了哪些state
            console.log('_effect.deps中添加元素: ', deps)
            _effect._deps[_effect._depsLength++] = deps
        } else {
            _effect._depsLength++
        }
    }
}


