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
            return mountedElement(newVNode, container, refer)
        } else {
            // 两个虚拟dom的key和type都没变;
            // 就要复用原来的真实dom; 更新其属性和children
            return patchElement(preVNode, newVNode)
        }


    }

    /**
     * 初次渲染,
     * @param vNode
     * @param container
     */
    const mountedElement = (vNode, container, refer) => {
        const {type, props, children, shapeFlag} = vNode
        const mountedEl = vNode.el = hostCreateElement(type)
        hostInsert(mountedEl, container, refer)
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
                hostPatchProp(el, key, props1[key], null)
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
                patchKeyedChildren(children1, children2, el)
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


    const patchKeyedChildren = (children1, children2, el) => {
        let i = 0
        let e1 = children1.length - 1
        let e2 = children2.length - 1


        // 先从头找相同的, 比如:
        // oldChildren: a b c d
        // newChildren: a b e d
        // 对于a,b; 相同,会让他们patch, i停到2
        while (i <= e1 && i <= e2) {
            const c1 = children1[i]
            const c2 = children2[i]
            if (isSameVNode(c1, c2)) {
                patch(c1, c2, el, null)
            } else {
                break
            }
            i++
        }

        // 再从尾找相同的, 比如:
        // oldChildren: a b c d
        // newChildren: a b e d
        // 对于d; 会让他们patch, 但是i还是停到第一个不相等的索引(从头开始数); e1,e2停到第一个不相等的索引(从尾开始数)
        // 当然i,e1,e2也可能是不符(i <= e1 && i <= e2)而停
        while (i <= e1 && i <= e2) {
            const c1 = children1[e1]
            const c2 = children2[e2]
            if (isSameVNode(c1, c2)) {
                patch(c1, c2, el, null)
            } else {
                break
            }
            e1--;
            e2--;
        }

        // 如果新的children比老的多;
        // 并且只是在尾部或头部插入(就是说中间的都相等: 比如 abc->abcd; 或者 abc-> eabc;)
        // 会满足条件: i>e1&&i<=e2
        if (i > e1) {
            if (i <= e2) {
                // 判断是头插还是尾插
                // 如果是头插, e2指向的是要插入链表的最后一个,也是原链表的前一个(比如abc-> xyeabc; e2最后指向的是e, 是'xye'最后一个, 是'abc'的前一个)
                // 所以头插的话, 拿到e2的下一个节点, 是有节点的; 如果是尾插,e2下一个是没有的)
                const next = e2 + 1
                // 直接再获取el, hostInsert如果refer为undefined即为尾插, 否则为往refer前面插入
                const refer = children1[next]?.el
                while (i <= e2) {
                    const node = children2[i]
                    hostInsert(node.el, el, refer)
                    i++
                }
            }
        }
        // 同样的, 如果是从多到少, 满足条件(i>e2&&i<=e1);   前提是除了少了的几个,其他都没变,可能从前面或后面少,比如(abc->bc; abcd-> ab)
        else if (i > e2) {
            if (i <= e1) {
                while (i <= e1) {
                    unMount(children1[i])
                    i++
                }
            }
        }

        // 剩下的情况就是: 中间的乱序了, 两头可能有相同或没有相同的;
        // 之所以对上面的两种情况特殊处理;
        // 是因为平常在头部或尾部插入若干dom比较常见, 头部尾部插入若干dom也比较常见


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