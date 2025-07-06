/**
 * @Author: cj
 * @Date: 2025/7/5 下午4:14
 *
 */

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
        debugger

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
        const {type, props, children} = vNode
        const mountedEl = hostCreateElement(type)
        hostInsert(mountedEl, container)
        props && setProps(mountedEl, null, props)
        //
        // 暂时假定都是text, 测试一下
        hostSetElementText(mountedEl, children)

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

    const setChildren = (el, children) => {
        if (!children) return

        if (Array.isArray(children)) {

        }

    }

    const setChild = (el, child) => {
        if (!child) return

    }


    return {
        render
    }
}


