/**
 * @Author: cj
 * @Date: 2025/7/7 09:05
 *
 */

import {isArr, isNil, isString, ShapeFlags} from "@mini-vue/shared";
import {isSameVNode} from "./vNode";
import {RuntimeFlags} from "packages/shared/src/constant";
import {createComponentInstance, setupComponentInstance} from "./component";
import {ReactivityEffect} from "@mini-vue/reactivity";
import {queueJob} from "./schedule";

export interface createRendererOptions {
    insert: (el: Node, parent: Node, refer?: Node) => void;
    remove: (el: Node) => void;
    patchProp: (el: Element, key: string, prevValue: any, nextValue: any) => void;
    createElement: (type: string) => Element;
    createText: (text: string) => Text;
    createComment: (text: string) => Comment;
    setText: (node: Text, text: string) => void;
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
        setText: hostSetText,
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

        if (isNil(vNode)) {
            const preVNode = container._vnode
            preVNode && unMount(preVNode)
            return
        }

        // 当第一次渲染一个vnode,preVNode为null
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

        // debugger
        // 前后两次虚拟dom变了(type或key变了); 就删除老dom,重新渲染新dom
        if (preVNode && !isSameVNode(preVNode, newVNode)) {
            unMount(preVNode)
            preVNode = null
        }

        // debugger

        // todo: 确定了的bug, 如果创建的h函数为: h('div',null, '我是text1', h('h1', '我是h1'), h('h2', '我是h2'), '我是text2' )
        // 那么无法正常渲染, 因为setElementText调用的是textContent, 会直接覆盖, 最后只渲染'我是text2'

        // todo: 确定了的bug, unmountChildren方法, 对于children数组中有string的情况, 删除不了

        // todo: patchKeyedChildren方法, 对于都没有key的情况(都是undefined),有问题
        const {type, shapeFlag} = newVNode
        switch (type) {
            case RuntimeFlags.Text:
                processText(preVNode, newVNode, container)
                break
            case RuntimeFlags.Fragment:
                processFragment(preVNode, newVNode, container)
                break
            default:
                // debugger
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(preVNode, newVNode, container, refer)
                }
                // ShapeFlags.COMPONENT 包括函数组件和状态组件
                else if (shapeFlag & ShapeFlags.COMPONENT) {
                    processComponent(preVNode, newVNode, container, refer)
                }
        }


    }

    const processText = (preVNode, newVNode, container) => {
        if (!preVNode) {
            const textNode = hostCreateText(newVNode.children)
            newVNode.el = textNode
            hostInsert(textNode, container)
        } else {
            const el = newVNode.el = preVNode.el
            if (preVNode.children !== newVNode.children) {
                hostSetText(el, newVNode.children)
            }
        }
    }

    const processFragment = (preVNode, newVNode, container) => {
        if (!preVNode) {
            mountedChildren(container, newVNode.children)
        } else {
            patchChildren(preVNode, newVNode, container)
        }
    }

    const processElement = (preVNode, newVNode, container, refer) => {
        // debugger
        // 初次渲染
        if (!preVNode) {
            return mountedElement(newVNode, container, refer)
        } else {
            // 两个虚拟dom的key和type都没变;
            // 就要复用原来的真实dom; 更新其属性和children
            return patchElement(preVNode, newVNode)
        }
    }

    const processComponent = (preVNode, newVNode, container, refer) => {
        if (isNil(preVNode)) {
            mountComponent(newVNode, container, refer)
        }
        /**
         *  一个组件传入的props更新了， 更新组件；
         *  比如一个子组件，h(Component，props), 如果这个props变了，就会到这里
         *  而不是在组件内部的props被修改了，（比如this。props.age = 20; 因为组件内部自动会触发effec更新）
         */
        else {
            // debugger
            updateComponent(preVNode, newVNode)
        }
    }

    const updateComponent = (preVNode, newVNode) => {
        // 复用instance
        const instance = newVNode.component = preVNode.component

        if (shouldUpdateComponent(preVNode, newVNode)) {
            instance.next = newVNode
            instance.update()
        }
    }

    const shouldUpdateComponent = (preVNode, newVNode) => {
        const {props: preProps = {}, children: preChildren} = preVNode
        const {props: newProps = {}, children: newChildren} = newVNode

        // 有插槽, 直接运行
        if (preChildren || newChildren) return true

        // 属性是否变化?
        return hasVNodePropsChanged(preProps, newProps)
    }

    const hasVNodePropsChanged = (preProps, newProps) => {
        if (preProps === newProps) return false

        const keys1 = Object.keys(preProps)
        if (keys1.length !== Object.keys(newProps).length) {
            return true
        }

        for (let i = 0; i < keys1.length; i++) {
            const key = keys1[i]
            if (preProps[key] !== newProps[key]) {
                return true
            }
        }
    }

    /**
     * 更新组件实例上的props(响应式), newProps是vnode上的所有props(instance.props+attrs),
     * @param instance
     * @param preProps
     * @param newProps
     */
    const updateComponentProps = (instance, preProps, newProps = {}) => {
        // 都是对象引用, 并且preProps还是shallowReactive, 所以直接操作形参没问题
        // 一个一个修改属性, 因为instance.props是reactive; 直接覆盖会丢失响应式
        const {propsOptions, attrs} = instance
        Object.keys(newProps).forEach(key => {
            if (key in propsOptions) {
                preProps[key] = newProps[key]
            } else {
                attrs[key] = newProps[key]
            }
        })

        // 先处理props的删除
        Object.keys(preProps).forEach(key => {
            if (!(key in newProps)) {
                delete preProps[key]
            }
        })
        // 再处理attrs的删除
        Object.keys(attrs).forEach(key => {
            if (!(key in newProps)) {
                delete attrs[key]
            }
        })
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
        props && patchElementProps(mountedEl, null, props)

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
    const patchElementProps = (el, preProps, newProps) => {
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
        // debugger
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
        // children的container
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
        patchChildren(vNode1, vNode2, el)
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
    const patchChildren = (vNode1, vNode2, container) => {
        if (!vNode1 || !vNode2) return

        const children1 = vNode1.children
        const children2 = vNode2.children
        const preShapeFlag = vNode1.shapeFlag
        const shapeFlag = vNode2.shapeFlag

        // 新的是text
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 删除老数组
                unMountChildren(children1)
            }
            if (children1 !== children2) {
                hostSetElementText(container, children2)
            }
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 新的是数组
            // 老的也是数组
            if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 全量diff算法
                patchKeyedChildren(children1, children2, container)
            } else {
                // 老的是null或text
                // 老的是text
                if (preShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    hostSetElementText(container, null)
                }
                mountedChildren(container, children2)
            }
        } else {
            // 新的是null
            // 老的是数组
            if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                unMountChildren(children1)
            } else if (preShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                // 老的是text
                hostSetElementText(container, null)
            }
        }
    }


    const patchKeyedChildren = (children1, children2, container) => {
        // debugger
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
                patch(c1, c2, container, null)
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
                patch(c1, c2, container, null)
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
                    patch(null, node, container, refer)
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

        // 之所以对上面的两种情况特殊处理;
        // 是因为平常在头部或尾部插入若干dom比较常见, 头部尾部插入若干dom也比较常见
        // 剩下的情况就是: 中间的乱序了, 两头可能有相同或没有相同的;

        let s1 = i
        let s2 = i

        // 选取新children的乱序段为基准, 记录每个key对应的数组索引
        const keyToNewIndexMap = new Map()

        // 新children里面,有多少乱序的, 需要diff算法
        const willPatchedAmount = e2 - i + 1;

        // 用来存新序列的这段乱序片段中, 每个节点在老的乱序片段中的索引
        // 比如 old: a b e c d g; new: a b c d e h g
        // 那么 现在乱序片段就是 ecd->cdeh
        // 那么这个数组长度是4, 结果应该为[3,4,2,0];比如第一个3表示c在old中的索引是3; 其中0表示在原片段中不存在(比如这个h不存在)
        // 但是为了避免0的异议, (即如果前面都不相同: e c d g=>c d e h g),那么这个0有异议, 所以实际存的值是索引+1
        const newIndexToOldMapIndex = Array(willPatchedAmount).fill(0)
        // init map
        for (let i = s2; i <= e2; i++) {
            const child = children2[i]
            keyToNewIndexMap.set(child.key, i)
        }

        for (let i = s1; i <= e1; i++) {
            const oldVNode = children1[i]
            const newIndex = keyToNewIndexMap.get(oldVNode.key)
            // 说明老的要被删除
            if (newIndex === undefined) {
                unMount(oldVNode)
            }
            // 说明新老数组中都有这个node,可以复用, 直接patch
            else {
                // newIndex - s2即这个新节点的索引相对于children2乱序片段的开始的索引
                // i + 1 : children1中的实际索引+1, 避免与索引0混淆
                // 这个数组相当于索引代表的是children2乱序片段中的每个元素,
                // 每个值代表children2中每个元素在children1对应的位置,
                // 目的就是让能不动的dom尽量不动,(最长递增子序列并不是要求相邻), 新值删除其中间的dom最后也能达成最长递增子序列dom不动

                // debugger
                newIndexToOldMapIndex[newIndex - s2] = i + 1
                patch(oldVNode, children2[newIndex], container, null)
            }
        }
        // debugger
        console.log('newIndexToOldMapIndex', newIndexToOldMapIndex)

        // 寻找最长递增子序列
        const increasingSequence = getSequence(newIndexToOldMapIndex)
        console.log('寻找最长递增子序列', increasingSequence)
        let j = increasingSequence.length - 1;

        for (let i = willPatchedAmount - 1; i >= 0; i--) {
            const index = s2 + i
            const current = children2[index]
            // 因为插入的时候, 只提供了往refer前面插入的方法;
            // 如果refer为null, 相当于appendChild
            const refer = index + 1 < children2.length ? children2[index + 1].el : null

            // 说明是老children中没有的,需要新增
            if (newIndexToOldMapIndex[i] === 0) {
                patch(null, current, container, refer)
            } else {
                // 因为increasingSequence存的也是索引,(存的时候+1了)
                // 说明当前节点可以不用动,直接跳过
                // 这里的判断条件要注意:
                // 1. 返回的increasingSequence里面存的是传入值newIndexToOldMapIndex数组的索引
                // 2. 传入值newIndexToOldMapIndex数组的长度, 是和children2乱序片段的长度对应的,
                //     比如 old: a b e c d g; new: a b c d e h g; newIndexToOldMapIndex长度为4, 对应c d e h
                // 3. 所以这里是和i比较, 循环是倒序循环, 变量j也是倒序从increasingSequence倒序
                if (increasingSequence[j] === i) {
                    j--
                } else {
                    hostInsert(current.el, container, refer)
                }
            }
        }
    }

    // 网上博客讲解
    // https://www.cnblogs.com/burc/p/17964032
    const getSequence = (indexArr) => {
        if (!indexArr || indexArr.length === 0) return []

        let len = indexArr.length
        let left;
        let high;
        let middle;
        // 最后返回的数组中的元素, 也是表示的索引, 索引0是一定存在的;
        // 这个索引是传入的arr的索引, 而不是其元素的值;
        // 相当于是arr中元素值的映射而已, 用这个元素在arr中的索引来代表这个元素
        // 默认indexArr中第一个元素最小, 即其索引为0
        const result = [0]

        // 记录这个节点的上一个节点的索引
        // 其实就是一个回溯表
        const pre = Array(len).fill(undefined)

        for (let i = 0; i < len; i++) {
            const index = indexArr[i]
            // 值为0表示老children中, 没有这个新节点, 只能创建
            if (index === 0) continue

            const resultLastIndex = result.at(-1)
            if (index > indexArr[resultLastIndex]) {
                // 这里最后push一个元素, 之前的lastIndex就成为了上一个元素
                // 即此时遍历到indexArr中第i个元素, 我们说indexArr[i]的上一个node是indexArr[result.length-1]
                // 但是此时的i和result中存的值都不过是索引, 所以是一种映射, 比较抽象
                pre[i] = resultLastIndex
                result.push(i)
                continue
            }

            // 去二分查找, 找当前的i应该替换result中哪一个索引的值
            left = 0
            high = result.length - 1
            while (left < high) {
                middle = ((left + high) / 2) | 0
                if (indexArr[result[middle]] < index) {
                    left = middle + 1
                } else {
                    high = middle
                }
            }
            // todo 验证此时left,high应该相等
            // 这里是跳过相等的情况, 比如result=[0]时, 此时i也=0
            if (index < indexArr[result[left]]) {
                // 这里进行替换, 虽然可能导致最后的结果顺序不对,但是个数是对的, 最后用pre进行回溯
                result[left] = i
                // 记住前一个是谁
                pre[i] = result[left - 1]
            }
        }

        // 进行回溯, 调整顺序,
        // 倒序是因为最后一位一定是确定的, 一定是最大的那一个
        // 不是说这个最大的是indexArr中最大的, 而是无论它是多少, 一定是这个递增子序列中最大的, 所以倒序
        let resultLen = result.length
        let last = result[resultLen - 1]
        while (resultLen > 0) {
            resultLen--
            // result中存的是indexArr的索引,
            result[resultLen] = last
            // pre中存的是,这个indexArr的索引的上一个节点应该是谁
            last = pre[last]
        }
        return result
    }

    const mountComponent = (vnode, container, refer) => {
        // debugger
        // 1.创建组件实例
        // 组件实例挂到vnode上,方便后续patch
        const instance = vnode.component = createComponentInstance(vnode)

        // 2. instance设置属性
        setupComponentInstance(instance)

        // 3.创建_effect实例，形成响应式
        setupRenderEffect(instance, container, refer)

    }

    const setupRenderEffect = (instance, container, refer) => {
        const updateComponent = () => {
            const {isMounted, proxy, subTree: preSubTree, render, next: nextVNode} = instance
            // debugger
            if (!isMounted) {
                // render可以传入一个形参(proxy), render里面可以用proxy.age或者this.age
                const subTree = render.call(proxy, proxy)
                instance.subTree = subTree
                instance.isMounted = true
                console.log('mountedSubTree', subTree)
                patch(null, subTree, container, refer)
            } else {

                // 如果有, 说明进入到了processComponent的else分支
                if (nextVNode) {
                    updateComponentPreRender(instance, nextVNode)
                    // 不能直接return, 因为这里直接return , 然后由job来回调这个函数,
                    // =>patch subTree=>Fragment=>patchChildren=>processComponent=>shouldUpdateComponent=>回到这个updateComponent
                    // => 然后进入这个if => updateComponentProps=>set=>trigger=> 由于一开始job就执行了_effect.run(), 所以running=1, 所以这个trigger直接return了
                    // =>后面的代码就没机会执行了(patch 子组件的subTree执行不了了)

                    // return
                }

                // render中, 如果修改了state的值,(比如通过定时器), 一般不会这么做, 只是为了测试这个mounted
                const subTree = render.call(proxy, proxy)
                console.log('preSubTree', preSubTree)
                console.log('newSubTree', subTree)

                // debugger
                patch(preSubTree, subTree, container, refer)
                instance.subTree = subTree
            }
        }

        const _effect = new ReactivityEffect(updateComponent, () => queueJob(update))
        // const _effect = new ReactivityEffect(updateComponent, () => {
        //     console.log('update')
        //     update()
        // })

        const update = instance.update = () => {
            _effect.run()
        }
        update()
        console.log('mountedInstance', instance)
    }

    const updateComponentPreRender = (instance, nextVNode) => {
        instance.next = null
        instance.vnode = nextVNode
        updateComponentProps(instance, instance.props, nextVNode.props)
    }


    const unMount = (vnode) => {
        hostRemove(vnode.el)
    }

    // todo 这里的卸载应该是有问题的, 因为children中, vnode和string都有, 如果是string, 这个unmount没用
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