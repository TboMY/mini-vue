/**
 * @Author: cj
 * @Date: 2025/7/7 09:05
 *
 */

import {isArr, isString, ShapeFlags} from "@mini-vue/shared";
import {isSameVNode} from "./vNode";

export interface createRendererOptions {
    insert: (el: Node, parent: Node, refer?: Node) => void;
    remove: (el: Node) => void;
    patchProp: (el: Element, key: string, prevValue: any, nextValue: any) => void;
    createElement: (type: string) => Element;
    createText: (text: string) => Text;
    createComment: (text: string) => Comment;
    // setText: (node: Text, text: string) => void;
    setElementText: (el: Element, text: string) => void;
    parentNode: (node: Node) => Node | null;
    nextSibling: (node: Node) => Node | null;
    // setScopeId?: (el: Element, id: string) => void;
    // insertStaticContent?: (content: string, parent: Element, anchor: Node | null, isSVG: boolean) => [Node, Node, boolean];
}

export function createRenderer(options: createRendererOptions) {
    // 这里解构出来是因为 createRendererOptions 是可以定义(如canvas也可自定义options结合vue[比如canvas自定义他的createElement方法])
    // core不关心到底如何去渲染
    const {
        insert: hostInsert,
        remove: hostRemove,
        patchProp: hostPatchProp,
        createElement: hostCreateElement,
        createText: hostCreateText,
        createComment: hostCreateComment,
        // setText: hostSetText,
        setElementText: hostSetElementText,
        parentNode: hostParentNode,
        nextSibling: hostNextSibling,
        // setScopeId: hostSetScopeId = NOOP,
        // insertStaticContent: hostInsertStaticContent
    } = options;

    /**
     * 将虚拟节点变为真实节点
     * @param vNode
     * @param container
     */
    const render = (vNode, container) => {
        // debugger

        // 如果第一次渲染,preVNode为null
        patch(container._vnode || null, vNode, container, null)

        // _vnode表示这个container之前渲染的vnode, 如果没有表示是第一次渲染
        container._vnode = vNode
    }


    /**
     * 比对两次vnode
     * @param preVNode
     * @param newVNode
     * @param container
     * @param refer
     */
    const patch = (preVNode, newVNode, container, refer) => {
        // 不重复渲染
        if (preVNode === newVNode) return

        if (!newVNode) return;

        // 前后两次虚拟dom变了(type或key变了); 就删除老dom,重新渲染新dom
        if (preVNode && !isSameVNode(preVNode, newVNode)) {
            unMount(preVNode)
            preVNode = null
        }

        // 初次渲染
        if (!preVNode) {
            return mountedElement(newVNode, container)
        } else {
            // 两个虚拟dom的key和type都没变;
            // 就要复用原来的真实dom; 更新其属性和children
            patchElement(preVNode, newVNode)
        }


    }

    /**
     * 初次渲染,
     * @param vNode
     * @param container
     */
    const mountedElement = (vNode, container) => {
        const {type, props, children, shapeFlag} = vNode
        const mountedEl = vNode.el = hostCreateElement(type)
        hostInsert(mountedEl, container)
        props && setProps(mountedEl, null, props)

        // 这里通过位运算判断children的类型; 类似前端组件权限控制的方式

        // 只是一个文本
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(mountedEl, children)
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 是一个数组,
            mountedChildren(mountedEl, children)
        }

    }

    /**
     * 比对props然后设置props
     * @param el
     * @param preProps
     * @param newProps
     */
    const setProps = (el, preProps, newProps) => {
        if (!preProps && !newProps) return;

        preProps = preProps || {};
        newProps = newProps || {};
        const keys = new Set([
            ...Object.keys(preProps),
            ...Object.keys(newProps)
        ]);

        keys.forEach(key => {
            hostPatchProp(el, key, preProps[key], newProps[key]);
        });
    }

    /**
     * mounted时, 循环递归地渲染children
     * @param el
     * @param children
     */
    const mountedChildren = (el, children) => {
        children.forEach(child => {
            // debugger
            if (isString(child)) {
                hostSetElementText(el, child)
                return
            }
            patch(null, child, el, null)
        })
    }

    // n1, n2 对应的真实dom是一样的
    const patchElement = (vNode1, vNode2) => {
        const props1 = vNode1.props || {}
        const props2 = vNode2.props || {}
        const el = vNode2.el = vNode1.el

        // 新的都保留
        for (const key in props2) {
            hostPatchProp(el, key, props1[key], props2[key])
        }

        // 老的有,新的没有要删除
        for (const key in props1) {
            if (!(key in props2)) {
                hostPatchProp(el, key, props1[key], props2[key])
            }
        }

        // 更新children
        const children1 = vNode1.children || {}
        const children2 = vNode2.children || {}
        patchChildren({vNode1, vNode2, children1, children2})
    }


    //  老: text, 新: text
    //  老: arr, 新: text
    //  老: null, 新: text
    //  老: text, 新: arr
    //  老: arr, 新: arr
    //  老: null, 新: arr
    //  老: text, 新: null
    //  老: arr, 新: null
    //  老: null, 新: null

    // 合并之后:
    // 老: text,null; 新: text
    //  老: arr, 新: text,null
    //  老: text, 新: arr
    //  老: arr, 新: arr
    //  老: null, 新: arr
    //  老: text,null, 新: null
    const patchChildren = ({vNode1, vNode2, children1, children2}) => {
        if (!vNode1 || !vNode2) return

        const el = vNode2.el
        const preShapeFlag = vNode1.shapeFlag
        const shapeFlag = vNode2.shapeFlag

        // 新的是text
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 老的是文本, 要删除老的
            if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 删除老数组
                unMountChildren(children1)
            }
            if (children1 !== children2) {
                hostSetElementText(el, children2)
            }
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 新的是数组
            // 老的也是数组
            if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // diff算法


            } else {
                // 老的是null或text
                // 老的是text
                if (preShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    hostSetElementText(el, null)
                }
                mountedChildren(el, children2)
            }
        } else {
            // 新的是null
            // 老的是数组
            if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                unMountChildren(children1)
            } else if (preShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                // 老的是text
                hostSetElementText(el, null)
            }
        }


    }

    const unMount = (vnode) => {
        hostRemove(vnode.el)
    }

    const unMountChildren = (children) => {
        if (!isArr(children)) return
        for (let i = 0; i < children.length; i++) {
            unMount(children[i])
        }
    }


    return {
        render
    }
}