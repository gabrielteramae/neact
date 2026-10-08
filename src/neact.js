const TEXT = "#text";
let current = null;
let hookIndex = 0;
let pendingEffects = [];
export function h(type, props, ...children) {
    const flat = [];
    const stack = children.flat(Infinity);
    for (const child of stack) {
        if (child == null || child === false || child === true)
            continue;
        if (typeof child === "object" && child !== null && "type" in child) {
            flat.push(child);
        }
        else {
            flat.push({ type: TEXT, props: { nodeValue: String(child) }, children: [] });
        }
    }
    const nextProps = { ...(props ?? {}) };
    const key = nextProps.key;
    delete nextProps.key;
    delete nextProps.children;
    return { type, props: nextProps, children: flat, key };
}
export function useState(initial) {
    const instance = current;
    if (!instance)
        throw new Error("useState fora do render do neact");
    const index = hookIndex++;
    if (instance.hooks.length <= index) {
        const value = typeof initial === "function" ? initial() : initial;
        instance.hooks.push({ state: value, deps: null });
    }
    const hook = instance.hooks[index];
    const setState = (value) => {
        const next = typeof value === "function" ? value(hook.state) : value;
        if (Object.is(next, hook.state))
            return;
        hook.state = next;
        rerender(instance);
    };
    return [hook.state, setState];
}
export function useEffect(fn, deps) {
    const instance = current;
    if (!instance)
        throw new Error("useEffect fora do render do neact");
    const index = hookIndex++;
    if (instance.hooks.length <= index)
        instance.hooks.push({ state: null, deps: null });
    const hook = instance.hooks[index];
    const previous = hook.deps;
    const changed = !deps ||
        !previous ||
        deps.length !== previous.length ||
        deps.some((item, itemIndex) => !Object.is(item, previous[itemIndex]));
    if (changed) {
        pendingEffects.push(() => {
            hook.cleanup?.();
            const cleanup = fn();
            hook.cleanup = typeof cleanup === "function" ? cleanup : undefined;
            hook.deps = deps ?? null;
        });
    }
}
function flushEffects() {
    const queued = pendingEffects;
    pendingEffects = [];
    for (const run of queued)
        run();
}
function rerender(instance) {
    updateComponent(instance, instance.vnode, instance.parentDom);
    queueMicrotask(flushEffects);
}
export function render(vnode, container) {
    const previous = container.__neact;
    const next = previous ? patch(previous, vnode, container) : mount(vnode, container);
    container.__neact = next;
    queueMicrotask(flushEffects);
    return () => {
        const live = container.__neact;
        if (!live)
            return;
        removeInstance(live);
        delete container.__neact;
    };
}
function patch(previous, vnode, parent) {
    if (previous.vnode.type !== vnode.type) {
        removeInstance(previous);
        return mount(vnode, parent);
    }
    return update(previous, vnode, parent);
}
function mount(vnode, parent) {
    if (typeof vnode.type === "function") {
        const instance = { vnode, dom: null, childInstances: [], hooks: [], parentDom: parent };
        return updateComponent(instance, vnode, parent);
    }
    const dom = createHost(vnode);
    parent.appendChild(dom);
    const instance = { vnode, dom, childInstances: [], hooks: [], parentDom: parent };
    if (vnode.type !== TEXT) {
        instance.childInstances = vnode.children.map((child) => mount(child, dom));
    }
    return instance;
}
function update(previous, vnode, parent) {
    if (typeof vnode.type === "function")
        return updateComponent(previous, vnode, parent);
    if (vnode.type === TEXT) {
        const text = previous.dom;
        const value = String(vnode.props.nodeValue ?? "");
        if (text.nodeValue !== value)
            text.nodeValue = value;
        previous.vnode = vnode;
        return previous;
    }
    const oldProps = previous.vnode.props;
    applyProps(previous.dom, oldProps, vnode.props);
    previous.vnode = vnode;
    previous.childInstances = reconcile(previous.dom, previous.childInstances, vnode.children);
    return previous;
}
function updateComponent(instance, vnode, parent) {
    instance.vnode = vnode;
    instance.parentDom = parent;
    current = instance;
    hookIndex = 0;
    let child = null;
    try {
        child = vnode.type({
            ...vnode.props,
            children: vnode.children,
        });
    }
    finally {
        current = null;
    }
    if (!child) {
        for (const nested of instance.childInstances)
            removeInstance(nested);
        instance.childInstances = [];
        instance.dom = null;
        return instance;
    }
    const previousChild = instance.childInstances[0];
    const nextChild = previousChild ? patch(previousChild, child, parent) : mount(child, parent);
    instance.childInstances = [nextChild];
    instance.dom = firstNode(nextChild);
    return instance;
}
function reconcile(parent, previous, next) {
    const byKey = new Map();
    for (const instance of previous) {
        if (instance.vnode.key != null)
            byKey.set(String(instance.vnode.key), instance);
    }
    const used = new Set();
    const produced = [];
    next.forEach((vnode, index) => {
        const keyed = vnode.key != null ? byKey.get(String(vnode.key)) : undefined;
        const indexed = previous[index];
        const match = keyed && keyed.vnode.type === vnode.type
            ? keyed
            : !keyed && indexed && indexed.vnode.key == null && indexed.vnode.type === vnode.type
                ? indexed
                : undefined;
        if (match && !used.has(match)) {
            used.add(match);
            produced.push(update(match, vnode, parent));
        }
        else {
            produced.push(mount(vnode, parent));
        }
    });
    for (const instance of previous) {
        if (!used.has(instance))
            removeInstance(instance);
    }
    for (const instance of produced) {
        const node = firstNode(instance);
        if (node?.parentNode === parent)
            parent.appendChild(node);
    }
    return produced;
}
function firstNode(instance) {
    if (typeof instance.vnode.type !== "function")
        return instance.dom;
    return instance.childInstances[0] ? firstNode(instance.childInstances[0]) : null;
}
function removeInstance(instance) {
    if (typeof instance.vnode.type === "function") {
        for (const hook of instance.hooks)
            hook.cleanup?.();
        for (const child of instance.childInstances)
            removeInstance(child);
        return;
    }
    instance.dom?.parentNode?.removeChild(instance.dom);
}
function createHost(vnode) {
    if (vnode.type === TEXT)
        return document.createTextNode(String(vnode.props.nodeValue ?? ""));
    const el = document.createElement(vnode.type);
    applyProps(el, {}, vnode.props);
    return el;
}
function applyProps(el, prev, next) {
    const names = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const name of names) {
        if (name === "children" || name === "key")
            continue;
        const before = prev[name];
        const after = next[name];
        if (Object.is(before, after))
            continue;
        if (name === "className") {
            el.className = after == null ? "" : String(after);
            continue;
        }
        if (name === "value" && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
            const text = after == null ? "" : String(after);
            if (el.value !== text)
                el.value = text;
            continue;
        }
        if (name.startsWith("on") && (typeof before === "function" || typeof after === "function")) {
            const event = name.slice(2).toLowerCase();
            if (typeof before === "function")
                el.removeEventListener(event, before);
            if (typeof after === "function")
                el.addEventListener(event, after);
            continue;
        }
        if (typeof after === "boolean") {
            if (after)
                el.setAttribute(name, "");
            else
                el.removeAttribute(name);
            continue;
        }
        if (after == null || after === false)
            el.removeAttribute(name);
        else
            el.setAttribute(name, String(after));
    }
}
