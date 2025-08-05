/**
 * @Author: cj
 * @Date: 2025/7/7 09:04
 *
 */
import {isArr, isObject, RuntimeFlags} from "@mini-vue/shared";
import {createVNode, isVNode} from "./vNode";


/**
 * 1. 形参大于等于3个: 第二个只能被视为props
 * 2. 形参大于等于3个: 从第三个参数开始都视为children
 * 3. 形参等于2个: 第二个参数可能为props,也可能为children(其中children可能是一个基本类型,也可能是一个数组,也可能是一个vnode)
 * 3. 形参等于2个: 如果第二个参数是一个对象, (可能为vnode或props); 如果是其他视为children
 * @param type
 * @param propsOrChildren
 * @param children
 */
export function h(type: string | symbol, propsOrChildren?: object | Array<any>, children?: Array<object | string>[]) {
    const len = arguments.length

    if (!type) {
        type = RuntimeFlags.Nil
    }

    // debugger

    // children只有arr,text,null三种, 没有children是单独的一个vnode的情况(方便patch)
    if (len >= 3) {

        if (len > 3) {
            children = Array.prototype.slice.call(arguments, 2)
        } else if (len === 3 && isVNode(children)) {
            children = [children]
        }
        return createVNode(type, propsOrChildren, children)
    } else {
        if (isObject(propsOrChildren) && !isArr(propsOrChildren)) {
            // 虽然propsOrChildren是一个对象, 但是更具体是一个vnode,所以视为children
            if (isVNode(propsOrChildren)) {
                // 为什么这里明明只是一个vnode, 但是还是要包裹在数组中? 但是如果是只是一个基本类型就不需要包裹在数组中?
                // 后续会进行规范化, (比如mountedChildren中),纯str转化为Text类型vnode
                return createVNode(type, undefined, [propsOrChildren])
            }
            return createVNode(type, propsOrChildren, undefined)
        } else {
            // 这里的propsOrChildren可能是一个基本类型, 也可能是一个数组
            // 如果是基本类型, 那么children就是propsOrChildren
            // 如果是数组, 那么children就是propsOrChildren
            return createVNode(type, undefined, propsOrChildren)
        }
    }
}



