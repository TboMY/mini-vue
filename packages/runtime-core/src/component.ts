import {hasOwn, isFunction, ShapeFlags} from "@mini-vue/shared";
import {proxyRefs, reactive} from "@mini-vue/reactivity";

export function createComponentInstance(vnode) {
    // type才是组件对象, 因为创建vnode的时候, 是比如 h(VueComponent), VueComponent才是object
    const {props: propsOptions} = vnode.type

    const instance = {
        data: null,
        props: null,
        attrs: null,
        slots: null,
        render: null,
        update: null,
        vnode,
        subTree: null, // 这个组件的children, 非Fragment的子vnode
        isMounted: false, // 标识符, 如果render里面修改了state, 导致指数爆炸级别的递归次数
        propsOptions, // 定义组件时的props
        proxy: null, // 这个组件实例的代理对象, 便于开发直接访问props,data里面的数据
        setupState: null, // setup函数返回值为对象时
        exposed: null, // 组件expose出去的值; 实例上叫exposed, 使用时的方法叫expose
    }
    return instance
}

export function setupComponentInstance(instance) {
    const {vnode} = instance
    const {data, render, setup} = vnode.type

    // 在组件中可以通过代理对象直接访问data,props,attrs等,
    // 而不用 this.props.age, 方便开发者
    const proxy = new Proxy(instance, instanceProxyHandler)
    instance.proxy = proxy
    initProps(instance, vnode.props)
    initSlots(instance, vnode)

    const state = reactive(isFunction(data) ? data.call(proxy) : (data || {}))
    instance.data = state
    instance.render = render

    // setup返回值可能是一个fn或obj; 是fn就代替render的作用(优先级高于单独的render), 是obj的作用和data类似(比如可以在render中使用),但不合并到data里面
    if (setup) {
        // context为 props, emits, attrs, slots,expose
        const context = {
            attrs: instance.attrs,
            slots: instance.slots,
            expose: (value) => instance.exposed = value,
            emits: (event = '', ...args) => {
                // debugger
                // 使用时 emits('myEvent','cj')
                // 定义时 v-on:myEvent (或者@myEvent) -> onMyEvent
                const eventName = `on${event[0].toUpperCase()}${event.slice(1)}`
                const handler = vnode?.props?.[eventName]
                handler && handler(...args)
            }
        }
        const setupResult = setup(instance.props, context)
        if (isFunction(setupResult)) {
            instance.render = setupResult
        } else {
            instance.setupState = proxyRefs(setupResult)
        }
    }
}

const initProps = (instance, vNodeProps) => {
    // 这都是指组件实例上的
    const props = {}
    const attrs = {}
    const {propsOptions = {}} = instance

    // todo 支持组件用数组形式定义props,
    //  以及对对象形式进行类型校验

    if (vNodeProps) {
        // 筛选出组件定义的props
        for (const key in vNodeProps) {
            const value = vNodeProps[key]
            if (key in propsOptions) {
                props[key] = value
            } else {
                attrs[key] = value
            }
        }
    }

    // todo shallowReactive
    // 这里应该是shallowReactive, 因为子组件不应该修改props,
    instance.props = reactive(props)
    instance.attrs = attrs
}

const initSlots = (instance, vNode) => {
    const {shapeFlag, children} = vNode
    if (shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        instance.slots = children
    } else {
        instance.slots = {}
    }
}

const publicProperty = {
    $attrs: (instance) => instance.attrs,
    $slots: (instance) => instance.slots
}
const instanceProxyHandler = {
    get(target, key, receiver) {
        // debugger
        const {data, props, setupState} = target
        if (data && hasOwn(data, key)) {
            return Reflect.get(data, key, receiver)
        } else if (props && hasOwn(props, key)) {
            return Reflect.get(props, key, receiver)
        } else if (setupState && hasOwn(setupState, key)) {
            return Reflect.get(setupState, key, receiver)
        }
        // instance上面会挂载一些公开的, 但是不准修改的属性, 比如($attrs, $slots)
        const getter = publicProperty[key]
        return getter?.(target)
    },
    set(target, key, val, receiver) {
        // debugger
        const {data, props, setupState} = target
        if (data && hasOwn(data, key)) {
            // 这里不能使用Reflect.set, 因为这里使用set会触发在reactive的proxyHandlers中的set，
            // 在那个方法中也会用到Reflect.set, 导致newvalue没有被更新到data中
            // return Reflect.set(data, key, val, receiver)
            data[key] = val
        } else if (props && hasOwn(props, key)) {
            // 按理说, 这里是不符合单向数据流的
            console.warn('props应该是只读的')
            // return Reflect.set(props, key, val, receiver)
            props[key] = val
        } else if (setupState && hasOwn(setupState, key)) {
            setupState[key] = val
        }
        return true
    }
}