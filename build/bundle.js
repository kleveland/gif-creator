
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function contrastImage(imgData, contrast){  //input range [-100..100]
      var d = imgData.data;
      contrast = (contrast/100) + 1;  //convert to decimal & shift range: [0..2]
      var intercept = 128 * (1 - contrast);
      for(var i=0;i<d.length;i+=4){   //r,g,b,a
          d[i] = d[i]*contrast + intercept;
          d[i+1] = d[i+1]*contrast + intercept;
          d[i+2] = d[i+2]*contrast + intercept;
      }
      return imgData;
    }

    function cropImageDimensions(image, left, top, width, height, cb) {
      console.log(left, top, width, height);
      const rawImageObj = new Image();
      const tempCanvas = document.createElement("canvas");
      rawImageObj.src = image;
      rawImageObj.onload = () => {
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCanvasCtx = tempCanvas.getContext("2d");
        tempCanvasCtx.drawImage(rawImageObj, -left, -top);
        tempCanvasCtx.putImageData(contrastImage(tempCanvasCtx.getImageData(0,0,tempCanvas.width, tempCanvas.height), -10), 0, 0);
        const croppedImageObj = new Image();
        croppedImageObj.src = tempCanvas.toDataURL("image/png");
        croppedImageObj.onload = () => cb(croppedImageObj);
      };
    }

    /* src\ImageImport.svelte generated by Svelte v3.38.3 */

    const { console: console_1$1, window: window_1 } = globals;
    const file$4 = "src\\ImageImport.svelte";

    function create_fragment$4(ctx) {
    	let div3;
    	let div0;
    	let canvas_1;
    	let t0;
    	let div1;
    	let t1;
    	let br0;
    	let t2;
    	let br1;
    	let t3;
    	let br2;
    	let t4;
    	let t5;
    	let div2;
    	let button0;
    	let t7;
    	let button1;
    	let t9;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			canvas_1 = element("canvas");
    			t0 = space();
    			div1 = element("div");
    			t1 = text("1. Choose an image");
    			br0 = element("br");
    			t2 = text("\r\n        2. Scroll to zoom in and out to fit a face around the size of the outline. ");
    			br1 = element("br");
    			t3 = text("\r\n      3. Right click to place points to outline the face. Ctrl+Z to undo.");
    			br2 = element("br");
    			t4 = text("\r\n      4. Press \"Crop Selection\"");
    			t5 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "Choose Image";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Crop Selection";
    			t9 = space();
    			input = element("input");
    			attr_dev(canvas_1, "id", "cropCanvas");
    			attr_dev(canvas_1, "width", INIT_WIDTH_CANVAS);
    			attr_dev(canvas_1, "height", INIT_WIDTH_CANVAS);
    			attr_dev(canvas_1, "class", "svelte-1vg85cu");
    			add_location(canvas_1, file$4, 312, 4, 8901);
    			add_location(div0, file$4, 311, 2, 8890);
    			add_location(br0, file$4, 325, 24, 9304);
    			add_location(br1, file$4, 326, 83, 9393);
    			add_location(br2, file$4, 327, 73, 9472);
    			attr_dev(div1, "class", "mdl-card__supporting-text svelte-1vg85cu");
    			add_location(div1, file$4, 324, 2, 9239);
    			attr_dev(button0, "class", "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored");
    			attr_dev(button0, "id", "import");
    			add_location(button0, file$4, 331, 4, 9577);
    			attr_dev(button1, "class", "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored");
    			attr_dev(button1, "role", "button");
    			attr_dev(button1, "id", "crop");
    			add_location(button1, file$4, 338, 4, 9793);
    			set_style(input, "display", "none");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".jpg, .jpeg, .png");
    			add_location(input, file$4, 348, 4, 10060);
    			attr_dev(div2, "class", "mdl-card__actions mdl-card--border");
    			add_location(div2, file$4, 330, 2, 9523);
    			attr_dev(div3, "class", "image-import-container mdl-card mdl-shadow--2dp svelte-1vg85cu");
    			add_location(div3, file$4, 310, 0, 8825);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, canvas_1);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div1, t1);
    			append_dev(div1, br0);
    			append_dev(div1, t2);
    			append_dev(div1, br1);
    			append_dev(div1, t3);
    			append_dev(div1, br2);
    			append_dev(div1, t4);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t7);
    			append_dev(div2, button1);
    			append_dev(div2, t9);
    			append_dev(div2, input);
    			/*input_binding*/ ctx[14](input);

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "keydown", /*onKeyDown*/ ctx[5], false, false, false),
    					listen_dev(canvas_1, "contextmenu", /*onImageRightClick*/ ctx[8], false, false, false),
    					listen_dev(canvas_1, "wheel", /*onScroll*/ ctx[3], false, false, false),
    					listen_dev(canvas_1, "mousedown", /*onImageMouseDown*/ ctx[4], false, false, false),
    					listen_dev(canvas_1, "mousemove", /*onImageMouseMove*/ ctx[2], false, false, false),
    					listen_dev(canvas_1, "mouseup", /*onImageMouseUp*/ ctx[6], false, false, false),
    					listen_dev(canvas_1, "mouseout", /*onImageMouseOut*/ ctx[7], false, false, false),
    					listen_dev(button0, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[13], false, false, false),
    					listen_dev(input, "change", /*onFileSelected*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			/*input_binding*/ ctx[14](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const ZOOM_INCREASE = 0.2;
    const ZOOM_DECREASE = 0.05;
    const INIT_WIDTH_CANVAS = 400;
    const POINT_SIZE = 4;
    const UNDO_KEYCODE = 90;
    const pathWeight = 1.5;

    function checkScrollDirectionIsUp(event) {
    	if (event.wheelDelta) return event.wheelDelta > 0;
    	return event.deltaY < 0;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ImageImport", slots, []);
    	let fileinput;
    	let { croppedImage } = $$props;
    	let { step } = $$props;

    	let canvas,
    		ctx,
    		rawImageObj,
    		imageObj,
    		zoomLevel = 1,
    		canMouseX,
    		canMouseY,
    		offsetX,
    		offsetY,
    		position = { x: 0, y: 0 },
    		imageOrigPos = { ...position },
    		clickOrigPos,
    		newWidth,
    		newHeight,
    		isDragging = false,
    		isImageImported = false;

    	let points = [];

    	onMount(() => {
    		canvas = document.getElementById("cropCanvas");
    		ctx = canvas.getContext("2d");
    		drawOutline();
    		setOffsets();
    		document.addEventListener("scroll", setOffsets);
    		window.addEventListener("resize", setOffsets);
    	});

    	function setOffsets() {
    		const canvasOffset = canvas.getBoundingClientRect();
    		offsetX = canvasOffset.left;
    		offsetY = canvasOffset.top;
    	}

    	function drawOutline() {
    		const cx = canvas.width / 2;
    		const cy = canvas.height / 2;
    		const rx = 45;
    		const ry = 55;
    		ctx.save();
    		ctx.beginPath();
    		ctx.translate(cx - rx, cy - ry);
    		ctx.scale(rx, ry);
    		ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);
    		ctx.restore();
    		ctx.stroke();
    	}

    	function onImageMouseMove(e) {
    		canMouseX = parseInt(e.clientX - offsetX);
    		canMouseY = parseInt(e.clientY - offsetY);

    		if (isDragging && isImageImported) {
    			ctx.clearRect(0, 0, canvas.width, canvas.height);

    			position = {
    				x: imageOrigPos.x - (clickOrigPos.x - canMouseX),
    				y: imageOrigPos.y - (clickOrigPos.y - canMouseY)
    			};

    			// ctx.drawImage(rawImageObj, position.x, position.y, newWidth, newHeight);
    			// drawOutline();
    			refreshFrame();
    		}
    	}

    	function onScroll(e) {
    		e.preventDefault();

    		if (isImageImported) {
    			const zoomMagnitude = zoomLevel >= 1 ? ZOOM_INCREASE : ZOOM_DECREASE;
    			const zoomDelta = zoomMagnitude * (checkScrollDirectionIsUp(e) ? 1 : -1);
    			setZoom(zoomLevel + zoomDelta);
    		}
    	}

    	function onImageMouseDown(e) {
    		canMouseX = parseInt(e.clientX - offsetX);
    		canMouseY = parseInt(e.clientY - offsetY);
    		console.log("current mouse pos", canMouseX, canMouseY);
    		console.log("current image pos", position.x, position.y);

    		if (isImageImported && e.button === 0 && canMouseX > position.x && canMouseY > position.y && canMouseX < position.x + newWidth && canMouseY < position.y + newHeight) {
    			clickOrigPos = { x: canMouseX, y: canMouseY };
    			imageOrigPos = { ...position };
    			console.log("orig pos", clickOrigPos);
    			isDragging = true;
    		}
    	}

    	function onKeyDown(e) {
    		if (e.keyCode === UNDO_KEYCODE) {
    			console.log("undo");
    			points.pop();
    			console.log(points);
    			refreshFrame();
    		}
    	}

    	function onImageMouseUp(e) {
    		canMouseX = parseInt(e.clientX - offsetX);
    		canMouseY = parseInt(e.clientY - offsetY);
    		isDragging = false;
    		if (isImageImported && e.button === 1 && imageObj) refreshFrame();
    	}

    	function onImageMouseOut(e) {
    		canMouseX = parseInt(e.clientX - offsetX);
    		canMouseY = parseInt(e.clientY - offsetY);
    		isDragging = false;
    	}

    	function onImageRightClick(e) {
    		e.preventDefault();

    		if (isImageImported) {
    			console.log("adding pointer");

    			//store the points on mousedown
    			const point = { x: e.offsetX, y: e.offsetY };

    			points.push(point);
    			drawFullPointPath();
    		}
    	}

    	function refreshFrame() {
    		ctx.clearRect(0, 0, canvas.width, canvas.height);
    		ctx.drawImage(rawImageObj, position.x, position.y, newWidth, newHeight);
    		drawOutline();
    		drawFullPointPath();
    	}

    	function drawPoint(point) {
    		ctx.fillStyle = "rgb(63,81,181)";
    		ctx.beginPath();
    		console.log(point.x, point.y);
    		ctx.arc(point.x, point.y, POINT_SIZE, 0, 2 * Math.PI);
    		ctx.fill();
    	}

    	function drawPath(firstPoint, secondPoint) {
    		console.log("drawPath", firstPoint, secondPoint);
    		ctx.lineWidth = pathWeight;
    		ctx.beginPath();
    		ctx.moveTo(firstPoint.x, firstPoint.y);
    		ctx.lineTo(secondPoint.x, secondPoint.y);
    		ctx.stroke();
    	}

    	function drawFullPointPath() {
    		console.log(points);

    		for (let i = 1; i < points.length; i++) {
    			const prevPoint = points[i - 1];
    			const currentPoint = points[i];
    			drawPath(prevPoint, currentPoint);
    		}

    		console.log("drew paths");

    		for (let i = 0; i < points.length; i++) {
    			const currentPoint = points[i];
    			drawPoint(currentPoint);
    		}

    		console.log("drew points");
    	}

    	function onFileSelected(e) {
    		let image = e.target.files[0];
    		let reader = new FileReader();
    		reader.readAsDataURL(image);

    		reader.onload = e => {
    			rawImageObj = new Image();
    			rawImageObj.src = e.target.result;

    			rawImageObj.onload = () => {
    				const tempCanvas = document.createElement("canvas");

    				// Handle resizing image as needed on canvas
    				const whRatio = rawImageObj.height / rawImageObj.width;

    				const width = INIT_WIDTH_CANVAS;
    				const height = whRatio * width;
    				tempCanvas.width = width;
    				tempCanvas.height = height;
    				canvas.width = width;
    				canvas.height = height;
    				tempCanvas.getContext("2d").drawImage(rawImageObj, 0, 0, width, height);
    				setImageLoad(tempCanvas.toDataURL("image/jpeg"), canvas.width, canvas.height, true);
    				isImageImported = true;
    				setOffsets();
    			};
    		};
    	}

    	function setImageLoad(
    		imageSrc = canvas.toDataURL("image/jpeg"),
    	width = newWidth,
    	height = newHeight,
    	newImageObj = false,
    	shouldDrawOutline = true
    	) {
    		if (newImageObj) imageObj = new Image();
    		imageObj.src = imageSrc;
    		newWidth = width;
    		newHeight = height;

    		imageObj.onload = () => {
    			console.log("loaded2");
    			ctx.clearRect(0, 0, canvas.width, canvas.height);
    			ctx.drawImage(rawImageObj, position.x, position.y, width, height);
    			if (shouldDrawOutline) drawOutline();
    			setOffsets();
    		};
    	}

    	function setZoom(level) {
    		if (level < 0.1) zoomLevel = 0.1; else if (level > 5) zoomLevel = 5; else zoomLevel = level;
    		const [origWidth, origHeight] = [canvas.width, canvas.height];
    		setImageLoad(canvas.toDataURL("image/jpeg"), origWidth * level, origHeight * level);
    	}

    	function cropImage() {
    		const appliedImage = new Image();
    		const tempCanvas = document.createElement("canvas");
    		tempCanvas.width = canvas.width;
    		tempCanvas.height = canvas.height;
    		const tempCtx = tempCanvas.getContext("2d");
    		console.log(rawImageObj, position.x, position.y, newWidth, newHeight);
    		canvas.getContext("2d").drawImage(rawImageObj, position.x, position.y, newWidth, newHeight);
    		ctx.globalCompositeOperation = "destination-out";
    		tempCtx.drawImage(canvas, 0, 0);
    		appliedImage.src = canvas.toDataURL("image/jpeg");

    		//clear canvas
    		tempCtx.clearRect(0, 0, canvas.width, canvas.height);

    		tempCtx.beginPath();
    		tempCtx.globalCompositeOperation = "destination-over";
    		let leftMost = Number.MAX_SAFE_INTEGER; // higher then bounds of canvas
    		let topMost = Number.MAX_SAFE_INTEGER; // higher then bounds of canvas
    		let rightMost = 0;
    		let bottomMost = 0;

    		for (let i = 0; i < points.length; i++) {
    			const { x, y } = points[i];
    			if (x < leftMost) leftMost = x;
    			if (y < topMost) topMost = y;
    			if (x > rightMost) rightMost = x;
    			if (y > bottomMost) bottomMost = y;
    			if (i == 0) tempCtx.moveTo(x, y); else tempCtx.lineTo(x, y);
    		} //console.log(points[i],points[i+1])

    		points = [];

    		appliedImage.onload = () => {
    			let pattern = tempCtx.createPattern(appliedImage, "repeat");
    			tempCtx.fillStyle = pattern;
    			tempCtx.fill();
    			var dataurl = tempCanvas.toDataURL("image/png");

    			cropImageDimensions(dataurl, leftMost, topMost, rightMost - leftMost, bottomMost - topMost, img => {
    				$$invalidate(11, step = 2);
    				$$invalidate(0, croppedImage = img);
    			});
    		};
    	}

    	const writable_props = ["croppedImage", "step"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<ImageImport> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => fileinput.click();

    	const click_handler_1 = () => {
    		$$invalidate(0, croppedImage = cropImage());
    	};

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			fileinput = $$value;
    			$$invalidate(1, fileinput);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("croppedImage" in $$props) $$invalidate(0, croppedImage = $$props.croppedImage);
    		if ("step" in $$props) $$invalidate(11, step = $$props.step);
    	};

    	$$self.$capture_state = () => ({
    		cropImageDimensions,
    		onMount,
    		ZOOM_INCREASE,
    		ZOOM_DECREASE,
    		INIT_WIDTH_CANVAS,
    		POINT_SIZE,
    		UNDO_KEYCODE,
    		fileinput,
    		croppedImage,
    		step,
    		canvas,
    		ctx,
    		rawImageObj,
    		imageObj,
    		zoomLevel,
    		canMouseX,
    		canMouseY,
    		offsetX,
    		offsetY,
    		position,
    		imageOrigPos,
    		clickOrigPos,
    		newWidth,
    		newHeight,
    		isDragging,
    		isImageImported,
    		points,
    		setOffsets,
    		drawOutline,
    		onImageMouseMove,
    		onScroll,
    		checkScrollDirectionIsUp,
    		onImageMouseDown,
    		onKeyDown,
    		onImageMouseUp,
    		onImageMouseOut,
    		onImageRightClick,
    		refreshFrame,
    		drawPoint,
    		pathWeight,
    		drawPath,
    		drawFullPointPath,
    		onFileSelected,
    		setImageLoad,
    		setZoom,
    		cropImage
    	});

    	$$self.$inject_state = $$props => {
    		if ("fileinput" in $$props) $$invalidate(1, fileinput = $$props.fileinput);
    		if ("croppedImage" in $$props) $$invalidate(0, croppedImage = $$props.croppedImage);
    		if ("step" in $$props) $$invalidate(11, step = $$props.step);
    		if ("canvas" in $$props) canvas = $$props.canvas;
    		if ("ctx" in $$props) ctx = $$props.ctx;
    		if ("rawImageObj" in $$props) rawImageObj = $$props.rawImageObj;
    		if ("imageObj" in $$props) imageObj = $$props.imageObj;
    		if ("zoomLevel" in $$props) zoomLevel = $$props.zoomLevel;
    		if ("canMouseX" in $$props) canMouseX = $$props.canMouseX;
    		if ("canMouseY" in $$props) canMouseY = $$props.canMouseY;
    		if ("offsetX" in $$props) offsetX = $$props.offsetX;
    		if ("offsetY" in $$props) offsetY = $$props.offsetY;
    		if ("position" in $$props) position = $$props.position;
    		if ("imageOrigPos" in $$props) imageOrigPos = $$props.imageOrigPos;
    		if ("clickOrigPos" in $$props) clickOrigPos = $$props.clickOrigPos;
    		if ("newWidth" in $$props) newWidth = $$props.newWidth;
    		if ("newHeight" in $$props) newHeight = $$props.newHeight;
    		if ("isDragging" in $$props) isDragging = $$props.isDragging;
    		if ("isImageImported" in $$props) isImageImported = $$props.isImageImported;
    		if ("points" in $$props) points = $$props.points;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		croppedImage,
    		fileinput,
    		onImageMouseMove,
    		onScroll,
    		onImageMouseDown,
    		onKeyDown,
    		onImageMouseUp,
    		onImageMouseOut,
    		onImageRightClick,
    		onFileSelected,
    		cropImage,
    		step,
    		click_handler,
    		click_handler_1,
    		input_binding
    	];
    }

    class ImageImport extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { croppedImage: 0, step: 11 }, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ImageImport",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*croppedImage*/ ctx[0] === undefined && !("croppedImage" in props)) {
    			console_1$1.warn("<ImageImport> was created without expected prop 'croppedImage'");
    		}

    		if (/*step*/ ctx[11] === undefined && !("step" in props)) {
    			console_1$1.warn("<ImageImport> was created without expected prop 'step'");
    		}
    	}

    	get croppedImage() {
    		throw new Error("<ImageImport>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set croppedImage(value) {
    		throw new Error("<ImageImport>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get step() {
    		throw new Error("<ImageImport>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set step(value) {
    		throw new Error("<ImageImport>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    let partyParrot = {
      name: "Party Parrot",
      playSpeed: 70,
      positions: [
        {
          x: 67.5,
          y: 60.5,
        },
        {
          x: 66.5,
          y: 59.5,
        },
        {
          x: 50.5,
          y: 64.5,
        },
        {
          x: 42.5,
          y: 71.5,
        },
        {
          x: 39.5,
          y: 73.5,
        },
        {
          x: 44.5,
          y: 74.5,
        },
        {
          x: 60.5,
          y: 75.5,
        },
        {
          x: 71.5,
          y: 76.5,
        },
        {
          x: 78.5,
          y: 81.5,
        },
        {
          x: 85.5,
          y: 72.5,
        },
      ],
    };

    let partyBlob = {
      name: "Party Blob",
      playSpeed: 25,
      positions: [
        {
          x: 59.5,
          y: 23.5,
        },
        {
          x: 58.5,
          y: 22.5,
        },
        {
          x: 61.5,
          y: 26.5,
        },
        {
          x: 62.5,
          y: 30.5,
        },
        {
          x: 64.5,
          y: 43.5,
        },
        {
          x: 63.5,
          y: 52.5,
        },
        {
          x: 65.5,
          y: 63.5,
        },
        {
          x: 62.5,
          y: 67.5,
        },
        {
          x: 63.5,
          y: 64.5,
        },
        {
          x: 62.5,
          y: 59.5,
        },
        {
          x: 64,
          y: 49,
        },
        {
          x: 60,
          y: 39,
        },
        {
          x: 62,
          y: 33,
        },
        {
          x: 61,
          y: 25,
        },
        {
          x: 61,
          y: 16,
        },
        {
          x: 60,
          y: 14,
        },
        {
          x: 58,
          y: 4,
        },
        {
          x: 59,
          y: -2,
        },
        {
          x: 61,
          y: -4,
        },
        {
          x: 60,
          y: 9,
        },
        {
          x: 69,
          y: 28,
        },
        {
          x: 72,
          y: 34,
        },
        {
          x: 71,
          y: 47,
        },
        {
          x: 71,
          y: 56,
        },
        {
          x: 68,
          y: 60,
        },
        {
          x: 67,
          y: 65,
        },
        {
          x: 65,
          y: 72,
        },
        {
          x: 66,
          y: 65,
        },
        {
          x: 67,
          y: 53,
        },
        {
          x: 67,
          y: 41,
        },
        {
          x: 68,
          y: 36,
        },
        {
          x: 71,
          y: 24,
        },
        {
          x: 70,
          y: 19,
        },
        {
          x: 71,
          y: 11,
        },
        {
          x: 70,
          y: 5,
        },
        {
          x: 71,
          y: 2,
        },
      ],
    };

    var gifList = /*#__PURE__*/Object.freeze({
        __proto__: null,
        partyParrot: partyParrot,
        partyBlob: partyBlob
    });

    /* src\Button.svelte generated by Svelte v3.38.3 */

    const file$3 = "src\\Button.svelte";

    function create_fragment$3(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*buttonText*/ ctx[1]);
    			attr_dev(button, "class", "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored");
    			attr_dev(button, "role", "button");
    			attr_dev(button, "id", /*id*/ ctx[2]);
    			add_location(button, file$3, 6, 0, 96);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*onClick*/ ctx[0])) /*onClick*/ ctx[0].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*buttonText*/ 2) set_data_dev(t, /*buttonText*/ ctx[1]);

    			if (dirty & /*id*/ 4) {
    				attr_dev(button, "id", /*id*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Button", slots, []);
    	let { onClick } = $$props;
    	let { buttonText } = $$props;
    	let { id } = $$props;
    	const writable_props = ["onClick", "buttonText", "id"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("onClick" in $$props) $$invalidate(0, onClick = $$props.onClick);
    		if ("buttonText" in $$props) $$invalidate(1, buttonText = $$props.buttonText);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({ onClick, buttonText, id });

    	$$self.$inject_state = $$props => {
    		if ("onClick" in $$props) $$invalidate(0, onClick = $$props.onClick);
    		if ("buttonText" in $$props) $$invalidate(1, buttonText = $$props.buttonText);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [onClick, buttonText, id];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { onClick: 0, buttonText: 1, id: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*onClick*/ ctx[0] === undefined && !("onClick" in props)) {
    			console.warn("<Button> was created without expected prop 'onClick'");
    		}

    		if (/*buttonText*/ ctx[1] === undefined && !("buttonText" in props)) {
    			console.warn("<Button> was created without expected prop 'buttonText'");
    		}

    		if (/*id*/ ctx[2] === undefined && !("id" in props)) {
    			console.warn("<Button> was created without expected prop 'id'");
    		}
    	}

    	get onClick() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onClick(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get buttonText() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set buttonText(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    function commonjsRequire (target) {
    	throw new Error('Could not dynamically require "' + target + '". Please configure the dynamicRequireTargets option of @rollup/plugin-commonjs appropriately for this require call to behave properly.');
    }

    var gif = createCommonjsModule(function (module, exports) {
    // gif.js 0.2.0 - https://github.com/jnordberg/gif.js
    (function(f){{module.exports=f();}})(function(){return function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof commonjsRequire=="function"&&commonjsRequire;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r);}return n[o].exports}var i=typeof commonjsRequire=="function"&&commonjsRequire;for(var o=0;o<r.length;o++)s(r[o]);return s}({1:[function(require,module,exports){function EventEmitter(){this._events=this._events||{};this._maxListeners=this._maxListeners||undefined;}module.exports=EventEmitter;EventEmitter.EventEmitter=EventEmitter;EventEmitter.prototype._events=undefined;EventEmitter.prototype._maxListeners=undefined;EventEmitter.defaultMaxListeners=10;EventEmitter.prototype.setMaxListeners=function(n){if(!isNumber(n)||n<0||isNaN(n))throw TypeError("n must be a positive number");this._maxListeners=n;return this};EventEmitter.prototype.emit=function(type){var er,handler,len,args,i,listeners;if(!this._events)this._events={};if(type==="error"){if(!this._events.error||isObject(this._events.error)&&!this._events.error.length){er=arguments[1];if(er instanceof Error){throw er}else {var err=new Error('Uncaught, unspecified "error" event. ('+er+")");err.context=er;throw err}}}handler=this._events[type];if(isUndefined(handler))return false;if(isFunction(handler)){switch(arguments.length){case 1:handler.call(this);break;case 2:handler.call(this,arguments[1]);break;case 3:handler.call(this,arguments[1],arguments[2]);break;default:args=Array.prototype.slice.call(arguments,1);handler.apply(this,args);}}else if(isObject(handler)){args=Array.prototype.slice.call(arguments,1);listeners=handler.slice();len=listeners.length;for(i=0;i<len;i++)listeners[i].apply(this,args);}return true};EventEmitter.prototype.addListener=function(type,listener){var m;if(!isFunction(listener))throw TypeError("listener must be a function");if(!this._events)this._events={};if(this._events.newListener)this.emit("newListener",type,isFunction(listener.listener)?listener.listener:listener);if(!this._events[type])this._events[type]=listener;else if(isObject(this._events[type]))this._events[type].push(listener);else this._events[type]=[this._events[type],listener];if(isObject(this._events[type])&&!this._events[type].warned){if(!isUndefined(this._maxListeners)){m=this._maxListeners;}else {m=EventEmitter.defaultMaxListeners;}if(m&&m>0&&this._events[type].length>m){this._events[type].warned=true;console.error("(node) warning: possible EventEmitter memory "+"leak detected. %d listeners added. "+"Use emitter.setMaxListeners() to increase limit.",this._events[type].length);if(typeof console.trace==="function"){console.trace();}}}return this};EventEmitter.prototype.on=EventEmitter.prototype.addListener;EventEmitter.prototype.once=function(type,listener){if(!isFunction(listener))throw TypeError("listener must be a function");var fired=false;function g(){this.removeListener(type,g);if(!fired){fired=true;listener.apply(this,arguments);}}g.listener=listener;this.on(type,g);return this};EventEmitter.prototype.removeListener=function(type,listener){var list,position,length,i;if(!isFunction(listener))throw TypeError("listener must be a function");if(!this._events||!this._events[type])return this;list=this._events[type];length=list.length;position=-1;if(list===listener||isFunction(list.listener)&&list.listener===listener){delete this._events[type];if(this._events.removeListener)this.emit("removeListener",type,listener);}else if(isObject(list)){for(i=length;i-- >0;){if(list[i]===listener||list[i].listener&&list[i].listener===listener){position=i;break}}if(position<0)return this;if(list.length===1){list.length=0;delete this._events[type];}else {list.splice(position,1);}if(this._events.removeListener)this.emit("removeListener",type,listener);}return this};EventEmitter.prototype.removeAllListeners=function(type){var key,listeners;if(!this._events)return this;if(!this._events.removeListener){if(arguments.length===0)this._events={};else if(this._events[type])delete this._events[type];return this}if(arguments.length===0){for(key in this._events){if(key==="removeListener")continue;this.removeAllListeners(key);}this.removeAllListeners("removeListener");this._events={};return this}listeners=this._events[type];if(isFunction(listeners)){this.removeListener(type,listeners);}else if(listeners){while(listeners.length)this.removeListener(type,listeners[listeners.length-1]);}delete this._events[type];return this};EventEmitter.prototype.listeners=function(type){var ret;if(!this._events||!this._events[type])ret=[];else if(isFunction(this._events[type]))ret=[this._events[type]];else ret=this._events[type].slice();return ret};EventEmitter.prototype.listenerCount=function(type){if(this._events){var evlistener=this._events[type];if(isFunction(evlistener))return 1;else if(evlistener)return evlistener.length}return 0};EventEmitter.listenerCount=function(emitter,type){return emitter.listenerCount(type)};function isFunction(arg){return typeof arg==="function"}function isNumber(arg){return typeof arg==="number"}function isObject(arg){return typeof arg==="object"&&arg!==null}function isUndefined(arg){return arg===void 0}},{}],2:[function(require,module,exports){var UA,browser,mode,platform,ua;ua=navigator.userAgent.toLowerCase();platform=navigator.platform.toLowerCase();UA=ua.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/)||[null,"unknown",0];mode=UA[1]==="ie"&&document.documentMode;browser={name:UA[1]==="version"?UA[3]:UA[1],version:mode||parseFloat(UA[1]==="opera"&&UA[4]?UA[4]:UA[2]),platform:{name:ua.match(/ip(?:ad|od|hone)/)?"ios":(ua.match(/(?:webos|android)/)||platform.match(/mac|win|linux/)||["other"])[0]}};browser[browser.name]=true;browser[browser.name+parseInt(browser.version,10)]=true;browser.platform[browser.platform.name]=true;module.exports=browser;},{}],3:[function(require,module,exports){var EventEmitter,GIF,browser,extend=function(child,parent){for(var key in parent){if(hasProp.call(parent,key))child[key]=parent[key];}function ctor(){this.constructor=child;}ctor.prototype=parent.prototype;child.prototype=new ctor;child.__super__=parent.prototype;return child},hasProp={}.hasOwnProperty,indexOf=[].indexOf||function(item){for(var i=0,l=this.length;i<l;i++){if(i in this&&this[i]===item)return i}return -1},slice=[].slice;EventEmitter=require("events").EventEmitter;browser=require("./browser.coffee");GIF=function(superClass){var defaults,frameDefaults;extend(GIF,superClass);defaults={workerScript:"gif.worker.js",workers:2,repeat:0,background:"#fff",quality:10,width:null,height:null,transparent:null,debug:false,dither:false};frameDefaults={delay:500,copy:false};function GIF(options){var base,key,value;this.running=false;this.options={};this.frames=[];this.freeWorkers=[];this.activeWorkers=[];this.setOptions(options);for(key in defaults){value=defaults[key];if((base=this.options)[key]==null){base[key]=value;}}}GIF.prototype.setOption=function(key,value){this.options[key]=value;if(this._canvas!=null&&(key==="width"||key==="height")){return this._canvas[key]=value}};GIF.prototype.setOptions=function(options){var key,results,value;results=[];for(key in options){if(!hasProp.call(options,key))continue;value=options[key];results.push(this.setOption(key,value));}return results};GIF.prototype.addFrame=function(image,options){var frame,key;if(options==null){options={};}frame={};frame.transparent=this.options.transparent;for(key in frameDefaults){frame[key]=options[key]||frameDefaults[key];}if(this.options.width==null){this.setOption("width",image.width);}if(this.options.height==null){this.setOption("height",image.height);}if(typeof ImageData!=="undefined"&&ImageData!==null&&image instanceof ImageData){frame.data=image.data;}else if(typeof CanvasRenderingContext2D!=="undefined"&&CanvasRenderingContext2D!==null&&image instanceof CanvasRenderingContext2D||typeof WebGLRenderingContext!=="undefined"&&WebGLRenderingContext!==null&&image instanceof WebGLRenderingContext){if(options.copy){frame.data=this.getContextData(image);}else {frame.context=image;}}else if(image.childNodes!=null){if(options.copy){frame.data=this.getImageData(image);}else {frame.image=image;}}else {throw new Error("Invalid image")}return this.frames.push(frame)};GIF.prototype.render=function(){var j,numWorkers,ref;if(this.running){throw new Error("Already running")}if(this.options.width==null||this.options.height==null){throw new Error("Width and height must be set prior to rendering")}this.running=true;this.nextFrame=0;this.finishedFrames=0;this.imageParts=function(){var j,ref,results;results=[];for(j=0,ref=this.frames.length;0<=ref?j<ref:j>ref;0<=ref?++j:--j){results.push(null);}return results}.call(this);numWorkers=this.spawnWorkers();if(this.options.globalPalette===true){this.renderNextFrame();}else {for(j=0,ref=numWorkers;0<=ref?j<ref:j>ref;0<=ref?++j:--j){this.renderNextFrame();}}this.emit("start");return this.emit("progress",0)};GIF.prototype.abort=function(){var worker;while(true){worker=this.activeWorkers.shift();if(worker==null){break}this.log("killing active worker");worker.terminate();}this.running=false;return this.emit("abort")};GIF.prototype.spawnWorkers=function(){var numWorkers,ref,results;numWorkers=Math.min(this.options.workers,this.frames.length);(function(){results=[];for(var j=ref=this.freeWorkers.length;ref<=numWorkers?j<numWorkers:j>numWorkers;ref<=numWorkers?j++:j--){results.push(j);}return results}).apply(this).forEach(function(_this){return function(i){var worker;_this.log("spawning worker "+i);worker=new Worker(_this.options.workerScript);worker.onmessage=function(event){_this.activeWorkers.splice(_this.activeWorkers.indexOf(worker),1);_this.freeWorkers.push(worker);return _this.frameFinished(event.data)};return _this.freeWorkers.push(worker)}}(this));return numWorkers};GIF.prototype.frameFinished=function(frame){var j,ref;this.log("frame "+frame.index+" finished - "+this.activeWorkers.length+" active");this.finishedFrames++;this.emit("progress",this.finishedFrames/this.frames.length);this.imageParts[frame.index]=frame;if(this.options.globalPalette===true){this.options.globalPalette=frame.globalPalette;this.log("global palette analyzed");if(this.frames.length>2){for(j=1,ref=this.freeWorkers.length;1<=ref?j<ref:j>ref;1<=ref?++j:--j){this.renderNextFrame();}}}if(indexOf.call(this.imageParts,null)>=0){return this.renderNextFrame()}else {return this.finishRendering()}};GIF.prototype.finishRendering=function(){var data,frame,i,image,j,k,l,len,len1,len2,len3,offset,page,ref,ref1,ref2;len=0;ref=this.imageParts;for(j=0,len1=ref.length;j<len1;j++){frame=ref[j];len+=(frame.data.length-1)*frame.pageSize+frame.cursor;}len+=frame.pageSize-frame.cursor;this.log("rendering finished - filesize "+Math.round(len/1e3)+"kb");data=new Uint8Array(len);offset=0;ref1=this.imageParts;for(k=0,len2=ref1.length;k<len2;k++){frame=ref1[k];ref2=frame.data;for(i=l=0,len3=ref2.length;l<len3;i=++l){page=ref2[i];data.set(page,offset);if(i===frame.data.length-1){offset+=frame.cursor;}else {offset+=frame.pageSize;}}}image=new Blob([data],{type:"image/gif"});return this.emit("finished",image,data)};GIF.prototype.renderNextFrame=function(){var frame,task,worker;if(this.freeWorkers.length===0){throw new Error("No free workers")}if(this.nextFrame>=this.frames.length){return}frame=this.frames[this.nextFrame++];worker=this.freeWorkers.shift();task=this.getTask(frame);this.log("starting frame "+(task.index+1)+" of "+this.frames.length);this.activeWorkers.push(worker);return worker.postMessage(task)};GIF.prototype.getContextData=function(ctx){return ctx.getImageData(0,0,this.options.width,this.options.height).data};GIF.prototype.getImageData=function(image){var ctx;if(this._canvas==null){this._canvas=document.createElement("canvas");this._canvas.width=this.options.width;this._canvas.height=this.options.height;}ctx=this._canvas.getContext("2d");ctx.setFill=this.options.background;ctx.fillRect(0,0,this.options.width,this.options.height);ctx.drawImage(image,0,0);return this.getContextData(ctx)};GIF.prototype.getTask=function(frame){var index,task;index=this.frames.indexOf(frame);task={index:index,last:index===this.frames.length-1,delay:frame.delay,transparent:frame.transparent,width:this.options.width,height:this.options.height,quality:this.options.quality,dither:this.options.dither,globalPalette:this.options.globalPalette,repeat:this.options.repeat,canTransfer:browser.name==="chrome"};if(frame.data!=null){task.data=frame.data;}else if(frame.context!=null){task.data=this.getContextData(frame.context);}else if(frame.image!=null){task.data=this.getImageData(frame.image);}else {throw new Error("Invalid frame")}return task};GIF.prototype.log=function(){var args;args=1<=arguments.length?slice.call(arguments,0):[];if(!this.options.debug){return}return console.log.apply(console,args)};return GIF}(EventEmitter);module.exports=GIF;},{"./browser.coffee":2,events:1}]},{},[3])(3)});

    });

    /* src\CustomizeCanvas.svelte generated by Svelte v3.38.3 */

    const { console: console_1 } = globals;
    const file$2 = "src\\CustomizeCanvas.svelte";

    // (265:8) {:else}
    function create_else_block(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			i.textContent = "pause";
    			attr_dev(i, "class", "material-icons");
    			add_location(i, file$2, 265, 10, 8054);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(265:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (263:8) {#if !playInterval}
    function create_if_block$1(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			i.textContent = "play_arrow";
    			attr_dev(i, "class", "material-icons");
    			add_location(i, file$2, 263, 10, 7985);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(263:8) {#if !playInterval}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div3;
    	let span0;
    	let canvas_1;
    	let t0;
    	let div0;
    	let button0;
    	let i0;
    	let t2;
    	let span2;
    	let span1;
    	let t3;
    	let t4_value = /*frameCount*/ ctx[0] + 1 + "";
    	let t4;
    	let t5;
    	let button1;
    	let t6;
    	let button2;
    	let i1;
    	let t8;
    	let div1;
    	let t9;
    	let br0;
    	let t10;
    	let br1;
    	let t11;
    	let t12;
    	let div2;
    	let button3;
    	let t13;
    	let button4;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (!/*playInterval*/ ctx[1]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	button3 = new Button({
    			props: {
    				id: "goback",
    				onClick: /*goBackStep*/ ctx[2],
    				buttonText: "Back"
    			},
    			$$inline: true
    		});

    	button4 = new Button({
    			props: {
    				id: "generate",
    				onClick: /*generateGif*/ ctx[10],
    				buttonText: "Generate"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			span0 = element("span");
    			canvas_1 = element("canvas");
    			t0 = space();
    			div0 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			i0.textContent = "remove";
    			t2 = space();
    			span2 = element("span");
    			span1 = element("span");
    			t3 = text("Frame ");
    			t4 = text(t4_value);
    			t5 = space();
    			button1 = element("button");
    			if_block.c();
    			t6 = space();
    			button2 = element("button");
    			i1 = element("i");
    			i1.textContent = "add";
    			t8 = space();
    			div1 = element("div");
    			t9 = text("1. Press + to go forward, - to go backward");
    			br0 = element("br");
    			t10 = text("\r\n    2. Drag the face around if its not positioned correctly ");
    			br1 = element("br");
    			t11 = text("\r\n  3. Press \"Generate\" to download!");
    			t12 = space();
    			div2 = element("div");
    			create_component(button3.$$.fragment);
    			t13 = space();
    			create_component(button4.$$.fragment);
    			attr_dev(canvas_1, "id", "gifCanvas");
    			attr_dev(canvas_1, "class", "gif-canvas svelte-gp1d33");
    			attr_dev(canvas_1, "width", "128");
    			attr_dev(canvas_1, "height", "128");
    			add_location(canvas_1, file$2, 240, 4, 7177);
    			attr_dev(span0, "class", "gif-canvas-container svelte-gp1d33");
    			add_location(span0, file$2, 239, 2, 7136);
    			attr_dev(i0, "class", "material-icons");
    			add_location(i0, file$2, 257, 6, 7699);
    			attr_dev(button0, "class", "mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--2mini-fab svelte-gp1d33");
    			add_location(button0, file$2, 253, 4, 7529);
    			attr_dev(span1, "class", "mdl-chip__text");
    			add_location(span1, file$2, 260, 6, 7807);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "mdl-chip__action");
    			add_location(button1, file$2, 261, 6, 7873);
    			attr_dev(span2, "class", "mdl-chip mdl-chip--deletable");
    			add_location(span2, file$2, 259, 4, 7756);
    			attr_dev(i1, "class", "material-icons");
    			add_location(i1, file$2, 273, 6, 8310);
    			attr_dev(button2, "class", "mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--2mini-fab svelte-gp1d33");
    			add_location(button2, file$2, 269, 4, 8140);
    			attr_dev(div0, "class", "frame-count-container svelte-gp1d33");
    			add_location(div0, file$2, 252, 2, 7488);
    			add_location(br0, file$2, 277, 46, 8459);
    			add_location(br1, file$2, 278, 60, 8525);
    			attr_dev(div1, "class", "mdl-card__supporting-text");
    			add_location(div1, file$2, 276, 2, 8372);
    			attr_dev(div2, "class", "mdl-card__actions mdl-card--border");
    			add_location(div2, file$2, 281, 2, 8579);
    			attr_dev(div3, "class", "customize-canvas-container mdl-card mdl-shadow--2dp svelte-gp1d33");
    			add_location(div3, file$2, 238, 0, 7067);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, span0);
    			append_dev(span0, canvas_1);
    			append_dev(div3, t0);
    			append_dev(div3, div0);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div0, t2);
    			append_dev(div0, span2);
    			append_dev(span2, span1);
    			append_dev(span1, t3);
    			append_dev(span1, t4);
    			append_dev(span2, t5);
    			append_dev(span2, button1);
    			if_block.m(button1, null);
    			append_dev(div0, t6);
    			append_dev(div0, button2);
    			append_dev(button2, i1);
    			append_dev(div3, t8);
    			append_dev(div3, div1);
    			append_dev(div1, t9);
    			append_dev(div1, br0);
    			append_dev(div1, t10);
    			append_dev(div1, br1);
    			append_dev(div1, t11);
    			append_dev(div3, t12);
    			append_dev(div3, div2);
    			mount_component(button3, div2, null);
    			append_dev(div2, t13);
    			mount_component(button4, div2, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(canvas_1, "scroll", /*onScroll*/ ctx[3], false, false, false),
    					listen_dev(canvas_1, "mousedown", /*handleImageMouseDown*/ ctx[6], false, false, false),
    					listen_dev(canvas_1, "mousemove", /*handleImageMouseMove*/ ctx[9], false, false, false),
    					listen_dev(canvas_1, "mouseup", /*handleImageMouseUp*/ ctx[7], false, false, false),
    					listen_dev(canvas_1, "mouseout", /*handleImageMouseOut*/ ctx[8], false, false, false),
    					listen_dev(button0, "click", /*click_handler*/ ctx[14], false, false, false),
    					listen_dev(button1, "click", /*toggleCanvas*/ ctx[5], false, false, false),
    					listen_dev(button2, "click", /*click_handler_1*/ ctx[15], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[0] & /*frameCount*/ 1) && t4_value !== (t4_value = /*frameCount*/ ctx[0] + 1 + "")) set_data_dev(t4, t4_value);

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(button1, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button3.$$.fragment, local);
    			transition_in(button4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button3.$$.fragment, local);
    			transition_out(button4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block.d();
    			destroy_component(button3);
    			destroy_component(button4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getCenterCoords(origPos, image) {
    	const posX = origPos?.x ?? 0;
    	const posY = origPos?.y ?? 0;
    	const centerOffsetX = image.width / 2;
    	const centerOffsetY = image.height / 2;
    	return [posX - centerOffsetX, posY - centerOffsetY, posX, posY];
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CustomizeCanvas", slots, []);
    	let frameCount = 0;
    	let { croppedImage } = $$props;
    	let { step } = $$props;

    	const goBackStep = () => {
    		$$invalidate(11, step = 1);
    	};

    	let faceImage;
    	let { imageSelection = "partyParrot" } = $$props;
    	let imageFrameCount = 36;
    	let imagePlayRate = 25;
    	let loadedSelection = "partyParrot";
    	let canvas, ctx;
    	let positionsArr = [];
    	let arr;

    	let canvasOffset,
    		offsetX,
    		offsetY,
    		canMouseX,
    		canMouseY,
    		isDragging = false,
    		position = { x: 0, y: 0 },
    		imageOrigPos = { ...position },
    		clickOrigPos,
    		playInterval;

    	const onScroll = e => setOffsets();

    	onMount(() => {
    		canvas = document.getElementById("gifCanvas");
    		ctx = canvas.getContext("2d");
    		setOffsets();
    		document.addEventListener("scroll", setOffsets);
    		window.addEventListener("resize", setOffsets);

    		extractGif().then(imgArr => {
    			arr = imgArr;
    			positionsArr = [...gifList[imageSelection].positions];
    			imagePlayRate = gifList[imageSelection].playSpeed;
    			setFrame(0);
    		});
    	});

    	afterUpdate(() => {
    		console.log(imageSelection);

    		if (faceImage !== croppedImage || imageSelection !== loadedSelection) {
    			console.log(imageSelection, loadedSelection);
    			faceImage = croppedImage;

    			extractGif(imageSelection).then(imgArr => {
    				console.log(imgArr);
    				loadedSelection = imageSelection;
    				positionsArr = [...gifList[imageSelection].positions];
    				imagePlayRate = gifList[imageSelection].playSpeed;
    				arr = imgArr;
    				setFrame(0);
    			});
    		}
    	});

    	function setOffsets() {
    		canvasOffset = canvas.getBoundingClientRect();
    		offsetX = canvasOffset.left;
    		offsetY = canvasOffset.top;
    	}

    	function extractGif(imageSelection = loadedSelection) {
    		const Img = [];
    		let imgsLoaded = 0;
    		const totalFrames = gifList[imageSelection].positions.length;
    		console.log(imageSelection, totalFrames);
    		imageFrameCount = totalFrames;

    		return new Promise((resolve, reject) => {
    				for (var i = 0; i < totalFrames; i++) {
    					Img[i] = new Image();
    					Img[i].src = `${imageSelection}/${i}.gif`;

    					Img[i].onload = () => {
    						imgsLoaded++;
    						if (imgsLoaded === totalFrames) resolve(Img);
    					};
    				}
    			});
    	}

    	function setFrame(frame) {
    		ctx.clearRect(0, 0, 1000, 1000);
    		console.log(positionsArr);
    		$$invalidate(0, frameCount = frame);
    		console.log(frameCount, arr.length);
    		if (frameCount > arr.length - 1) $$invalidate(0, frameCount = 0);
    		if (frameCount < 0) $$invalidate(0, frameCount = arr.length - 1);
    		if (arr.length == imageFrameCount) drawFrame(frameCount);
    	}

    	function drawAnimatedImage(frame, overrideCtx) {
    		const targetCtx = overrideCtx ?? ctx;

    		if (!!arr[frame]) {
    			console.log("drawing parrot", arr[frame]);
    			targetCtx.drawImage(arr[frame], 0, 0);
    		}

    		targetCtx.restore();
    		return frame;
    	}

    	function drawOverlayImage(frameCount, overrideCtx) {
    		if (faceImage) {
    			const targetCtx = overrideCtx ?? ctx;

    			const posX = (positionsArr[frameCount]?.x)
    			? positionsArr[frameCount].x
    			: 0;

    			const posY = (positionsArr[frameCount]?.y)
    			? positionsArr[frameCount].y
    			: 0;

    			console.log(positionsArr, frameCount);
    			targetCtx.drawImage(faceImage, posX - faceImage.width / 2, posY - faceImage.height / 2, faceImage.width, faceImage.height);
    		}
    	}

    	function playCanvas() {
    		if (!playInterval) $$invalidate(1, playInterval = setInterval(
    			() => {
    				setFrame(frameCount + 1);
    			},
    			imagePlayRate
    		));
    	}

    	function pauseCanvas() {
    		if (playInterval) clearInterval(playInterval);
    		$$invalidate(1, playInterval = undefined);
    	}

    	function toggleCanvas() {
    		if (!playInterval) playCanvas(); else pauseCanvas();
    	}

    	function handleImageMouseDown(e) {
    		canMouseX = parseInt(e.offsetX);
    		canMouseY = parseInt(e.offsetY);
    		const [posX, posY, actualPosX, actualPosY] = getCenterCoords(positionsArr[frameCount], faceImage);
    		console.log(canMouseX, canMouseY, posX, posY);

    		if (e.button === 0 && canMouseX > posX && canMouseY > posY && canMouseX < posX + faceImage.width && canMouseY < posY + faceImage.height) {
    			clickOrigPos = { x: canMouseX, y: canMouseY };
    			imageOrigPos = { x: actualPosX, y: actualPosY };
    			console.log("orig pos", clickOrigPos);
    			isDragging = true;
    		}
    	}

    	function handleImageMouseUp(e) {
    		canMouseX = parseInt(e.offsetX);
    		canMouseY = parseInt(e.offsetY);

    		// clear the drag flag
    		isDragging = false;
    	}

    	function handleImageMouseOut(e) {
    		canMouseX = parseInt(e.offsetX);
    		canMouseY = parseInt(e.offsetY);

    		// user has left the canvas, so clear the drag flag
    		isDragging = false;
    	}

    	function handleImageMouseMove(e) {
    		canMouseX = parseInt(e.offsetX);
    		canMouseY = parseInt(e.offsetY);

    		// if the drag flag is set, clear the canvas and draw the image
    		if (isDragging) {
    			console.log(canMouseX, canMouseY);

    			positionsArr[frameCount] = {
    				x: imageOrigPos.x - (clickOrigPos.x - canMouseX),
    				y: imageOrigPos.y - (clickOrigPos.y - canMouseY)
    			};

    			drawFrame();
    		}
    	}

    	function drawFrame(frame = frameCount) {
    		ctx.clearRect(0, 0, canvas.width, canvas.height);
    		drawAnimatedImage(frame);
    		drawOverlayImage(frame);
    	}

    	function generateGif() {
    		const gif$1 = new gif({
    				workers: 2,
    				quality: 8,
    				transparent: 0,
    				width: 128,
    				height: 128
    			});

    		console.log("POSITIONS ARR", positionsArr);
    		const tempCanvas = document.createElement("canvas");
    		tempCanvas.width = 128;
    		tempCanvas.height = 128;
    		const tempCtx = tempCanvas.getContext("2d");

    		// tempCtx.fillStyle = "#ffffff";
    		console.log("image arr", arr);

    		arr.forEach((image, frameCount) => {
    			tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

    			//   tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    			console.log("frameCount", frameCount);

    			drawAnimatedImage(frameCount, tempCtx);
    			drawOverlayImage(frameCount, tempCtx);
    			gif$1.addFrame(tempCtx, { copy: true, delay: imagePlayRate });
    			console.log(image, frameCount);
    		});

    		gif$1.on("finished", function (blob) {
    			console.log(blob);
    			window.open(URL.createObjectURL(blob));
    		});

    		gif$1.render();
    		console.log("test here");
    	}

    	const writable_props = ["croppedImage", "step", "imageSelection"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<CustomizeCanvas> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setFrame(frameCount - 1);
    	const click_handler_1 = () => setFrame(frameCount + 1);

    	$$self.$$set = $$props => {
    		if ("croppedImage" in $$props) $$invalidate(12, croppedImage = $$props.croppedImage);
    		if ("step" in $$props) $$invalidate(11, step = $$props.step);
    		if ("imageSelection" in $$props) $$invalidate(13, imageSelection = $$props.imageSelection);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		afterUpdate,
    		gifList,
    		Button,
    		GIF: gif,
    		frameCount,
    		croppedImage,
    		step,
    		goBackStep,
    		faceImage,
    		imageSelection,
    		imageFrameCount,
    		imagePlayRate,
    		loadedSelection,
    		canvas,
    		ctx,
    		positionsArr,
    		arr,
    		canvasOffset,
    		offsetX,
    		offsetY,
    		canMouseX,
    		canMouseY,
    		isDragging,
    		position,
    		imageOrigPos,
    		clickOrigPos,
    		playInterval,
    		onScroll,
    		setOffsets,
    		extractGif,
    		setFrame,
    		drawAnimatedImage,
    		drawOverlayImage,
    		playCanvas,
    		pauseCanvas,
    		toggleCanvas,
    		handleImageMouseDown,
    		handleImageMouseUp,
    		handleImageMouseOut,
    		handleImageMouseMove,
    		drawFrame,
    		getCenterCoords,
    		generateGif
    	});

    	$$self.$inject_state = $$props => {
    		if ("frameCount" in $$props) $$invalidate(0, frameCount = $$props.frameCount);
    		if ("croppedImage" in $$props) $$invalidate(12, croppedImage = $$props.croppedImage);
    		if ("step" in $$props) $$invalidate(11, step = $$props.step);
    		if ("faceImage" in $$props) faceImage = $$props.faceImage;
    		if ("imageSelection" in $$props) $$invalidate(13, imageSelection = $$props.imageSelection);
    		if ("imageFrameCount" in $$props) imageFrameCount = $$props.imageFrameCount;
    		if ("imagePlayRate" in $$props) imagePlayRate = $$props.imagePlayRate;
    		if ("loadedSelection" in $$props) loadedSelection = $$props.loadedSelection;
    		if ("canvas" in $$props) canvas = $$props.canvas;
    		if ("ctx" in $$props) ctx = $$props.ctx;
    		if ("positionsArr" in $$props) positionsArr = $$props.positionsArr;
    		if ("arr" in $$props) arr = $$props.arr;
    		if ("canvasOffset" in $$props) canvasOffset = $$props.canvasOffset;
    		if ("offsetX" in $$props) offsetX = $$props.offsetX;
    		if ("offsetY" in $$props) offsetY = $$props.offsetY;
    		if ("canMouseX" in $$props) canMouseX = $$props.canMouseX;
    		if ("canMouseY" in $$props) canMouseY = $$props.canMouseY;
    		if ("isDragging" in $$props) isDragging = $$props.isDragging;
    		if ("position" in $$props) position = $$props.position;
    		if ("imageOrigPos" in $$props) imageOrigPos = $$props.imageOrigPos;
    		if ("clickOrigPos" in $$props) clickOrigPos = $$props.clickOrigPos;
    		if ("playInterval" in $$props) $$invalidate(1, playInterval = $$props.playInterval);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		frameCount,
    		playInterval,
    		goBackStep,
    		onScroll,
    		setFrame,
    		toggleCanvas,
    		handleImageMouseDown,
    		handleImageMouseUp,
    		handleImageMouseOut,
    		handleImageMouseMove,
    		generateGif,
    		step,
    		croppedImage,
    		imageSelection,
    		click_handler,
    		click_handler_1
    	];
    }

    class CustomizeCanvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				croppedImage: 12,
    				step: 11,
    				imageSelection: 13
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CustomizeCanvas",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*croppedImage*/ ctx[12] === undefined && !("croppedImage" in props)) {
    			console_1.warn("<CustomizeCanvas> was created without expected prop 'croppedImage'");
    		}

    		if (/*step*/ ctx[11] === undefined && !("step" in props)) {
    			console_1.warn("<CustomizeCanvas> was created without expected prop 'step'");
    		}
    	}

    	get croppedImage() {
    		throw new Error("<CustomizeCanvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set croppedImage(value) {
    		throw new Error("<CustomizeCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get step() {
    		throw new Error("<CustomizeCanvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set step(value) {
    		throw new Error("<CustomizeCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imageSelection() {
    		throw new Error("<CustomizeCanvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imageSelection(value) {
    		throw new Error("<CustomizeCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\GifList.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1 } = globals;
    const file$1 = "src\\GifList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[6] = i;
    	return child_ctx;
    }

    // (9:4) {#each gifListEntries as gif, i}
    function create_each_block(ctx) {
    	let li;
    	let span0;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1_value = /*gif*/ ctx[4][1].name + "";
    	let t1;
    	let t2;
    	let span1;
    	let label;
    	let input;
    	let t3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			img = element("img");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			span1 = element("span");
    			label = element("label");
    			input = element("input");
    			t3 = space();
    			attr_dev(img, "class", "gif-preview-image svelte-15spjx3");
    			if (img.src !== (img_src_value = `${/*gif*/ ctx[4][0]}/0.gif`)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", `${/*gif*/ ctx[4][0]}-preview`);
    			add_location(img, file$1, 11, 10, 383);
    			attr_dev(span0, "class", "mdl-list__item-primary-content");
    			add_location(span0, file$1, 10, 8, 326);
    			attr_dev(input, "type", "radio");
    			attr_dev(input, "id", "gif-option-" + /*i*/ ctx[6]);
    			attr_dev(input, "class", "mdl-radio__button");
    			attr_dev(input, "name", "gifselect");
    			input.__value = /*gif*/ ctx[4][0];
    			input.value = input.__value;
    			/*$$binding_groups*/ ctx[3][0].push(input);
    			add_location(input, file$1, 23, 12, 774);
    			attr_dev(label, "class", "demo-list-radio mdl-radio mdl-js-radio mdl-js-ripple-effect");
    			attr_dev(label, "for", "gif-option-" + /*i*/ ctx[6]);
    			add_location(label, file$1, 19, 10, 626);
    			attr_dev(span1, "class", "mdl-list__item-secondary-action");
    			add_location(span1, file$1, 18, 8, 568);
    			attr_dev(li, "class", "mdl-list__item");
    			add_location(li, file$1, 9, 6, 289);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(span0, img);
    			append_dev(span0, t0);
    			append_dev(span0, t1);
    			append_dev(li, t2);
    			append_dev(li, span1);
    			append_dev(span1, label);
    			append_dev(label, input);
    			input.checked = input.__value === /*selectedOption*/ ctx[0];
    			append_dev(li, t3);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectedOption*/ 1) {
    				input.checked = input.__value === /*selectedOption*/ ctx[0];
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			/*$$binding_groups*/ ctx[3][0].splice(/*$$binding_groups*/ ctx[3][0].indexOf(input), 1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(9:4) {#each gifListEntries as gif, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let ul;
    	let each_value = /*gifListEntries*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "mdl-list");
    			add_location(ul, file$1, 7, 2, 222);
    			attr_dev(div, "class", "gif-list-container mdl-card mdl-shadow--2dp svelte-15spjx3");
    			add_location(div, file$1, 6, 0, 161);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*gifListEntries, selectedOption*/ 3) {
    				each_value = /*gifListEntries*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("GifList", slots, []);
    	const gifListEntries = Object.entries(gifList);
    	let { selectedOption = "partyParrot" } = $$props;
    	const writable_props = ["selectedOption"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<GifList> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input_change_handler() {
    		selectedOption = this.__value;
    		$$invalidate(0, selectedOption);
    	}

    	$$self.$$set = $$props => {
    		if ("selectedOption" in $$props) $$invalidate(0, selectedOption = $$props.selectedOption);
    	};

    	$$self.$capture_state = () => ({ gifList, gifListEntries, selectedOption });

    	$$self.$inject_state = $$props => {
    		if ("selectedOption" in $$props) $$invalidate(0, selectedOption = $$props.selectedOption);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [selectedOption, gifListEntries, input_change_handler, $$binding_groups];
    }

    class GifList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { selectedOption: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GifList",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get selectedOption() {
    		throw new Error("<GifList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedOption(value) {
    		throw new Error("<GifList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    /* src\App.svelte generated by Svelte v3.38.3 */
    const file = "src\\App.svelte";

    // (21:29) 
    function create_if_block_1(ctx) {
    	let div0;
    	let giflist;
    	let updating_step;
    	let updating_selectedOption;
    	let div0_intro;
    	let div0_outro;
    	let t;
    	let div1;
    	let customizecanvas;
    	let updating_step_1;
    	let div1_intro;
    	let div1_outro;
    	let current;

    	function giflist_step_binding(value) {
    		/*giflist_step_binding*/ ctx[5](value);
    	}

    	function giflist_selectedOption_binding(value) {
    		/*giflist_selectedOption_binding*/ ctx[6](value);
    	}

    	let giflist_props = {};

    	if (/*step*/ ctx[0] !== void 0) {
    		giflist_props.step = /*step*/ ctx[0];
    	}

    	if (/*imageSelection*/ ctx[2] !== void 0) {
    		giflist_props.selectedOption = /*imageSelection*/ ctx[2];
    	}

    	giflist = new GifList({ props: giflist_props, $$inline: true });
    	binding_callbacks.push(() => bind(giflist, "step", giflist_step_binding));
    	binding_callbacks.push(() => bind(giflist, "selectedOption", giflist_selectedOption_binding));

    	function customizecanvas_step_binding(value) {
    		/*customizecanvas_step_binding*/ ctx[7](value);
    	}

    	let customizecanvas_props = {
    		croppedImage: /*croppedImage*/ ctx[1],
    		imageSelection: /*imageSelection*/ ctx[2]
    	};

    	if (/*step*/ ctx[0] !== void 0) {
    		customizecanvas_props.step = /*step*/ ctx[0];
    	}

    	customizecanvas = new CustomizeCanvas({
    			props: customizecanvas_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(customizecanvas, "step", customizecanvas_step_binding));

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(giflist.$$.fragment);
    			t = space();
    			div1 = element("div");
    			create_component(customizecanvas.$$.fragment);
    			attr_dev(div0, "class", "mdl-cell mdl-cell--6-col mdl-cell--12-col-tablet mdl-cell--12-col-phone");
    			add_location(div0, file, 21, 10, 726);
    			attr_dev(div1, "class", "mdl-cell mdl-cell--6-col mdl-cell--12-col-tablet mdl-cell--12-col-phone");
    			add_location(div1, file, 26, 10, 1005);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(giflist, div0, null);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(customizecanvas, div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const giflist_changes = {};

    			if (!updating_step && dirty & /*step*/ 1) {
    				updating_step = true;
    				giflist_changes.step = /*step*/ ctx[0];
    				add_flush_callback(() => updating_step = false);
    			}

    			if (!updating_selectedOption && dirty & /*imageSelection*/ 4) {
    				updating_selectedOption = true;
    				giflist_changes.selectedOption = /*imageSelection*/ ctx[2];
    				add_flush_callback(() => updating_selectedOption = false);
    			}

    			giflist.$set(giflist_changes);
    			const customizecanvas_changes = {};
    			if (dirty & /*croppedImage*/ 2) customizecanvas_changes.croppedImage = /*croppedImage*/ ctx[1];
    			if (dirty & /*imageSelection*/ 4) customizecanvas_changes.imageSelection = /*imageSelection*/ ctx[2];

    			if (!updating_step_1 && dirty & /*step*/ 1) {
    				updating_step_1 = true;
    				customizecanvas_changes.step = /*step*/ ctx[0];
    				add_flush_callback(() => updating_step_1 = false);
    			}

    			customizecanvas.$set(customizecanvas_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(giflist.$$.fragment, local);

    			add_render_callback(() => {
    				if (div0_outro) div0_outro.end(1);
    				if (!div0_intro) div0_intro = create_in_transition(div0, scale, { duration: 500, delay: 500 });
    				div0_intro.start();
    			});

    			transition_in(customizecanvas.$$.fragment, local);

    			add_render_callback(() => {
    				if (div1_outro) div1_outro.end(1);
    				if (!div1_intro) div1_intro = create_in_transition(div1, scale, { duration: 500, delay: 500 });
    				div1_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(giflist.$$.fragment, local);
    			if (div0_intro) div0_intro.invalidate();
    			div0_outro = create_out_transition(div0, scale, { duration: 500 });
    			transition_out(customizecanvas.$$.fragment, local);
    			if (div1_intro) div1_intro.invalidate();
    			div1_outro = create_out_transition(div1, scale, { duration: 500 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(giflist);
    			if (detaching && div0_outro) div0_outro.end();
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div1);
    			destroy_component(customizecanvas);
    			if (detaching && div1_outro) div1_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(21:29) ",
    		ctx
    	});

    	return block;
    }

    // (15:8) {#if step === 1}
    function create_if_block(ctx) {
    	let div;
    	let imageimport;
    	let updating_step;
    	let updating_croppedImage;
    	let div_intro;
    	let div_outro;
    	let current;

    	function imageimport_step_binding(value) {
    		/*imageimport_step_binding*/ ctx[3](value);
    	}

    	function imageimport_croppedImage_binding(value) {
    		/*imageimport_croppedImage_binding*/ ctx[4](value);
    	}

    	let imageimport_props = {};

    	if (/*step*/ ctx[0] !== void 0) {
    		imageimport_props.step = /*step*/ ctx[0];
    	}

    	if (/*croppedImage*/ ctx[1] !== void 0) {
    		imageimport_props.croppedImage = /*croppedImage*/ ctx[1];
    	}

    	imageimport = new ImageImport({ props: imageimport_props, $$inline: true });
    	binding_callbacks.push(() => bind(imageimport, "step", imageimport_step_binding));
    	binding_callbacks.push(() => bind(imageimport, "croppedImage", imageimport_croppedImage_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(imageimport.$$.fragment);
    			attr_dev(div, "class", "mdl-cell mdl-cell--12-col mdl-cell--12-col-tablet mdl-cell--12-col-phone");
    			add_location(div, file, 15, 10, 431);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(imageimport, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const imageimport_changes = {};

    			if (!updating_step && dirty & /*step*/ 1) {
    				updating_step = true;
    				imageimport_changes.step = /*step*/ ctx[0];
    				add_flush_callback(() => updating_step = false);
    			}

    			if (!updating_croppedImage && dirty & /*croppedImage*/ 2) {
    				updating_croppedImage = true;
    				imageimport_changes.croppedImage = /*croppedImage*/ ctx[1];
    				add_flush_callback(() => updating_croppedImage = false);
    			}

    			imageimport.$set(imageimport_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(imageimport.$$.fragment, local);

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, scale, { duration: 500, delay: 500 });
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(imageimport.$$.fragment, local);
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, scale, { duration: 500 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(imageimport);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(15:8) {#if step === 1}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div2;
    	let h1;
    	let t1;
    	let div1;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*step*/ ctx[0] === 1) return 0;
    		if (/*step*/ ctx[0] === 2) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Face GIF";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(h1, "class", "svelte-zfkvqv");
    			add_location(h1, file, 11, 4, 318);
    			attr_dev(div0, "class", "mdl-grid");
    			add_location(div0, file, 13, 6, 373);
    			attr_dev(div1, "class", "main-content svelte-zfkvqv");
    			add_location(div1, file, 12, 4, 340);
    			attr_dev(div2, "id", "app");
    			add_location(div2, file, 10, 2, 299);
    			attr_dev(main, "class", "container");
    			add_location(main, file, 9, 0, 272);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(div0, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let step = 1;
    	let croppedImage = null, imageSelection;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function imageimport_step_binding(value) {
    		step = value;
    		$$invalidate(0, step);
    	}

    	function imageimport_croppedImage_binding(value) {
    		croppedImage = value;
    		$$invalidate(1, croppedImage);
    	}

    	function giflist_step_binding(value) {
    		step = value;
    		$$invalidate(0, step);
    	}

    	function giflist_selectedOption_binding(value) {
    		imageSelection = value;
    		$$invalidate(2, imageSelection);
    	}

    	function customizecanvas_step_binding(value) {
    		step = value;
    		$$invalidate(0, step);
    	}

    	$$self.$capture_state = () => ({
    		ImageImport,
    		CustomizeCanvas,
    		GifList,
    		scale,
    		step,
    		croppedImage,
    		imageSelection
    	});

    	$$self.$inject_state = $$props => {
    		if ("step" in $$props) $$invalidate(0, step = $$props.step);
    		if ("croppedImage" in $$props) $$invalidate(1, croppedImage = $$props.croppedImage);
    		if ("imageSelection" in $$props) $$invalidate(2, imageSelection = $$props.imageSelection);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		step,
    		croppedImage,
    		imageSelection,
    		imageimport_step_binding,
    		imageimport_croppedImage_binding,
    		giflist_step_binding,
    		giflist_selectedOption_binding,
    		customizecanvas_step_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	// props: {
    	// 	name: 'world'
    	// }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
