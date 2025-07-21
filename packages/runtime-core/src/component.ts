import {hasOwn, isFunction} from "@mini-vue/shared";
import {reactive} from "@mini-vue/reactivity";

export function createComponentInstance(vnode) {
    // type才是组件对象, 因为创建vnode的时候, 是比如 h(VueComponent), VueComponent才是object
    const {props: propsOptions} = vnode.type

    const instance = {
        data: null,
        render: null,
        update: null,
        vnode,
        subTree: null, // 这个组件的children, 非Fragment的子vnode
        isMounted: false, // 标识符, 如果render里面修改了state, 导致指数爆炸级别的递归次数
        propsOptions, // 定义组件时的props
        proxy: null, // 这个组件实例的代理对象, 便于开发直接访问props,data里面的数据
    }
    return instance
}

export function setupComponentInstance(instance) {
    const {vnode} = instance
    const {data, render} = vnode.type

    // 在组件中可以通过代理对象直接访问data,props,attrs等,
    // 而不用 this.props.age, 方便开发者
    const proxy = new Proxy(instance, instanceProxyHandler)
    instance.proxy = proxy

    initProps(instance, vnode.props)

    const state = reactive(isFunction(data) ? data.call(proxy) : (data || {}))
    instance.data = state
    instance.render = render
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

const publicProperty = {
    $attrs: (instance) => instance.attrs,
    $slots: (instance) => instance.slots
}
const instanceProxyHandler = {
    get(target, key, receiver) {
        // debugger
        const {data, props,} = target
        if (data && hasOwn(data, key)) {
            return Reflect.get(data, key, receiver)
        } else if (props && hasOwn(props, key)) {
            return Reflect.get(props, key, receiver)
        }
        // instance上面会挂载一些公开的, 但是不准修改的属性, 比如($attrs, $slot)
        const getter = publicProperty[key]
        getter && getter(target)
    },
    set(target, key, val, receiver) {
        // debugger
        const {data, props,} = target
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
        }
        return true
    }
}