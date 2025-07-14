/**
 * @Author: cj
 * @Date: 2025/7/7 16:07
 *
 */

import {isArr, isNil, isObject, isString, ShapeFlags} from "@mini-vue/shared";
import {RuntimeFlags} from "packages/shared/src/constant";

export const createVNode = (type?: string | symbol, props?: any, children?: any) => {
    // debugger

    // 当前vnode的基本表示节点, 和children的类型进行或运算后, 得到总的shapeFlag
    // type也可能传入一个object, 当为object是为一个组件, 一个组件就是对象, 这个对象里面有data,render等函数
    const vNodeShapeFlag = isString(type) ? ShapeFlags.ELEMENT :
        isObject(type) ? ShapeFlags.STATEFUL_COMPONENT : 0
    const shapeFlag = vNodeShapeFlag | getChildrenShapeFlag(children)

    const vNode = {
        [RuntimeFlags.IS_V_NODE]: true,
        type,
        props,
        el: null, // 这个vnode对应的真实dom
        key: props?.key,
        shapeFlag, // 这里的标识是标识children和当前vNode的类型(一起的, 通过|运算符之后得到的)
        children: createChildren(children)
    }

    return vNode
}

const getChildrenShapeFlag = (children: any) => {
    if (isNil(children)) {
        return 0
    }

    if (isArr(children)) {
        return ShapeFlags.ARRAY_CHILDREN
    }

    if (!isObject(children)) {
        return ShapeFlags.TEXT_CHILDREN
    }
    return 0
}


const createChildren = (children: any) => {
    if (isNil(children)) return null

    // 如果children是一个基本类型, 返回字符串
    if (!isObject(children)) {
        return String(children)
    }

    if (isVNode(children)) {
        return children
    }

    if (isArr(children)) {
        return children.map(child => {
            return createChildren(child)
        })
    }
    return null
}

export function isVNode(val: any) {
    return isObject(val) && val[RuntimeFlags.IS_V_NODE]
}

export function isSameVNode(n1: any, n2: any) {
    return n1.type === n2.type && n1.key === n2.key
}