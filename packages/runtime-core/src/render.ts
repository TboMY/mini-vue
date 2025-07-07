/**
 * @Author: cj
 * @Date: 2025/7/7 09:05
 *
 */

import {isString, ShapeFlags} from "@mini-vue/shared";

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

        // 初次渲染
        if (!preVNode) {
            mountedElement(newVNode, container)
        }
    }

    /**
     * 初次渲染,
     * @param vNode
     * @param container
     */
    const mountedElement = (vNode, container) => {
        const {type, props, children, shapeFlag} = vNode
        const mountedEl = hostCreateElement(type)
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


    return {
        render
    }
}