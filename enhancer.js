// ==UserScript==
// @name         FileBrowser Tree Enhancer
// @author       vizzini
// @namespace    local.filebrowser.tree
// @version      0.5
// @description  File Browser Octotree 目录树 / 分屏 / 收起 / 固定 / 深浅色
// @match        http://192.168.3.138:8080/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ==============================
    // 基础配置
    // ==============================

    const NORMAL_WIDTH = 280;
    const COLLAPSED_WIDTH = 46;

    const THEME_KEY =
        'fbte-theme';

    const EXPANDED_KEY =
        'fbte-expanded-folders';

    const COLLAPSED_KEY =
        'fbte-sidebar-collapsed';

    const PINNED_KEY =
        'fbte-sidebar-pinned';


    // ==============================
    // 状态读取
    // ==============================

    function getBool(key, defaultValue) {

        const value =
            localStorage.getItem(key);

        if (value === null) {
            return defaultValue;
        }

        return value === 'true';
    }


    let sidebarCollapsed =
        getBool(
            COLLAPSED_KEY,
            false
        );


    let sidebarPinned =
        getBool(
            PINNED_KEY,
            true
        );


    // ==============================
    // 展开目录状态
    // ==============================

    function getExpandedPaths() {

        try {

            const value =
                JSON.parse(
                    localStorage.getItem(
                        EXPANDED_KEY
                    ) || '[]'
                );

            return new Set(
                Array.isArray(value)
                    ? value
                    : []
            );

        } catch (_) {

            return new Set();
        }
    }


    function saveExpandedPaths(set) {

        localStorage.setItem(
            EXPANDED_KEY,
            JSON.stringify(
                [...set]
            )
        );
    }


    const expandedPaths =
        getExpandedPaths();


    // ==============================
    // 当前路径
    // ==============================

    function getCurrentPath() {

        const index =
            location.pathname
                .indexOf('/files');

        if (index < 0) {
            return '/';
        }


        let path =
            location.pathname.substring(
                index + '/files'.length
            );


        try {

            path =
                decodeURIComponent(path);

        } catch (_) {}


        path =
            path.replace(
                /\/+$/,
                ''
            );


        return path || '/';
    }


    function normalizePath(path) {

        if (!path) {
            return '/';
        }


        if (path !== '/') {

            path =
                path.replace(
                    /\/+$/,
                    ''
                );
        }


        return path || '/';
    }


    // ==============================
    // 自动展开当前路径父目录
    // ==============================

    function addCurrentParents() {

        const current =
            normalizePath(
                getCurrentPath()
            );


        expandedPaths.add('/');


        if (current === '/') {

            saveExpandedPaths(
                expandedPaths
            );

            return;
        }


        const parts =
            current
                .split('/')
                .filter(Boolean);


        let path = '';


        for (
            const part of parts
        ) {

            path += '/' + part;


            if (
                path !== current
            ) {

                expandedPaths.add(
                    path
                );
            }
        }


        saveExpandedPaths(
            expandedPaths
        );
    }


    addCurrentParents();


    // ==============================
    // URL
    // ==============================

    function encodePath(path) {

        if (path === '/') {

            return '/';
        }


        return path
            .split('/')
            .map(
                (part, index) => {

                    if (
                        index === 0
                    ) {

                        return '';
                    }


                    return encodeURIComponent(
                        part
                    );
                }
            )
            .join('/');
    }


    function apiPath(path) {

        return (
            '/api/resources' +
            (
                path === '/'
                    ? '/'
                    : encodePath(path)
            )
        );
    }


    function fileURL(path) {

        if (path === '/') {

            return '/files/';
        }


        return (
            '/files' +
            encodePath(path) +
            '/'
        );
    }


    // ==============================
    // API
    // ==============================

    async function loadDirectories(path) {

        const jwt =
            localStorage.getItem(
                'jwt'
            );


        const headers = {};


        if (jwt) {

            headers['X-Auth'] =
                jwt;
        }


        const response =
            await fetch(
                apiPath(path),
                {
                    method: 'GET',

                    headers,

                    credentials:
                        'same-origin'
                }
            );


        if (!response.ok) {

            throw new Error(
                '目录读取失败：HTTP ' +
                response.status
            );
        }


        const data =
            await response.json();


        const items =
            Array.isArray(
                data.items
            )
                ? data.items
                : [];


        return items

            .filter(
                item =>
                    item &&
                    (
                        item.isDir === true ||

                        item.type ===
                            'directory' ||

                        item.type ===
                            'dir'
                    )
            )

            .sort(
                (a, b) =>
                    String(a.name)
                        .localeCompare(
                            String(b.name),
                            'zh-CN'
                        )
            );
    }


    // ==============================
    // Theme
    // ==============================

    function getTheme() {

        const saved =
            localStorage.getItem(
                THEME_KEY
            );


        if (
            saved === 'dark' ||
            saved === 'light'
        ) {

            return saved;
        }


        return window.matchMedia(
            '(prefers-color-scheme: dark)'
        ).matches

            ? 'dark'
            : 'light';
    }


    function applyTheme(theme) {

        const sidebar =
            document.getElementById(
                'fbte-sidebar'
            );


        if (!sidebar) {
            return;
        }


        sidebar.dataset.theme =
            theme;


        localStorage.setItem(
            THEME_KEY,
            theme
        );


        const button =
            document.getElementById(
                'fbte-theme'
            );


        if (button) {

            button.textContent =
                theme === 'dark'
                    ? '☀'
                    : '☾';


            button.title =
                theme === 'dark'
                    ? '切换浅色模式'
                    : '切换深色模式';
        }
    }


    // ==============================
    // 找 File Browser 主容器
    // ==============================

    function findAppRoot() {

        const candidates = [

            '#app',

            '#root',

            '.app',

            '[data-v-app]'
        ];


        for (
            const selector
            of candidates
        ) {

            const element =
                document.querySelector(
                    selector
                );


            if (
                element &&
                element.id !==
                    'fbte-sidebar'
            ) {

                return element;
            }
        }


        // 找不到明确 root 时
        // 取 body 第一个有效节点

        const children =
            Array.from(
                document.body.children
            );


        for (
            const child
            of children
        ) {

            if (
                child.id ===
                    'fbte-sidebar'
            ) {

                continue;
            }


            if (
                child.tagName ===
                    'SCRIPT' ||

                child.tagName ===
                    'STYLE'
            ) {

                continue;
            }


            return child;
        }


        return null;
    }


    // ==============================
    // 更新分屏布局
    // ==============================

    function updateLayout() {

        const sidebar =
            document.getElementById(
                'fbte-sidebar'
            );


        if (!sidebar) {
            return;
        }


        const width =
            sidebarCollapsed

                ? COLLAPSED_WIDTH

                : NORMAL_WIDTH;


        sidebar.style.width =
            width + 'px';


        sidebar.classList.toggle(
            'collapsed',
            sidebarCollapsed
        );


        sidebar.classList.toggle(
            'pinned',
            sidebarPinned
        );


        const app =
            findAppRoot();


        if (
            sidebarPinned &&
            app
        ) {

            app.style.marginLeft =
                width + 'px';


            app.style.width =
                `calc(100% - ${width}px)`;


            app.style.maxWidth =
                `calc(100% - ${width}px)`;


            app.style.boxSizing =
                'border-box';


            app.style.transition =
                'margin-left .18s ease, width .18s ease';


        } else if (app) {

            app.style.marginLeft =
                '0';


            app.style.width =
                '100%';


            app.style.maxWidth =
                '100%';
        }


        // ======================
        // 按钮状态
        // ======================

        const collapseButton =
            document.getElementById(
                'fbte-collapse'
            );


        if (collapseButton) {

            collapseButton.textContent =
                sidebarCollapsed
                    ? '▶'
                    : '◀';


            collapseButton.title =
                sidebarCollapsed
                    ? '展开侧栏'
                    : '收起侧栏';
        }


        const pinButton =
            document.getElementById(
                'fbte-pin'
            );


        if (pinButton) {

            pinButton.textContent =
                sidebarPinned
                    ? '📌'
                    : '📍';


            pinButton.title =
                sidebarPinned
                    ? '取消固定'
                    : '固定侧栏';
        }


        localStorage.setItem(
            COLLAPSED_KEY,
            String(
                sidebarCollapsed
            )
        );


        localStorage.setItem(
            PINNED_KEY,
            String(
                sidebarPinned
            )
        );
    }


    // ==============================
    // CSS
    // ==============================

    function injectStyle() {

        const style =
            document.createElement(
                'style'
            );


        style.id =
            'fbte-style';


        style.textContent = `

        #fbte-sidebar {

            --bg:
                #ffffff;

            --header:
                #fafafa;

            --button:
                #f1f3f4;

            --button-hover:
                #e5e7e9;

            --text:
                #242424;

            --muted:
                #777777;

            --border:
                #dadce0;

            --hover:
                #f1f3f4;

            --active:
                #e8f0fe;

            --active-text:
                #1967d2;


            position:
                fixed;


            left:
                0;

            top:
                0;

            bottom:
                0;


            width:
                ${NORMAL_WIDTH}px;


            background:
                var(--bg);


            color:
                var(--text);


            border-right:
                1px solid
                var(--border);


            z-index:
                2147483647;


            display:
                flex;


            flex-direction:
                column;


            box-shadow:
                2px 0 9px
                rgba(
                    0,
                    0,
                    0,
                    .07
                );


            transition:
                width .18s ease,
                background .18s ease,
                box-shadow .18s ease;


            font-family:
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                "Microsoft YaHei",
                sans-serif;


            font-size:
                14px;


            box-sizing:
                border-box;
        }


        #fbte-sidebar[data-theme="dark"] {

            --bg:
                #1f2023;

            --header:
                #242529;

            --button:
                #2c2e32;

            --button-hover:
                #36393e;

            --text:
                #e8e8e8;

            --muted:
                #9fa3a9;

            --border:
                #383a3f;

            --hover:
                #2b2d31;

            --active:
                #263850;

            --active-text:
                #8ab4f8;
        }


        /* =========================
           顶栏
           ========================= */

        #fbte-header {

            height:
                52px;


            flex:
                0 0 52px;


            display:
                flex;


            align-items:
                center;


            box-sizing:
                border-box;


            gap:
                4px;


            padding:
                0 8px;


            border-bottom:
                1px solid
                var(--border);


            background:
                var(--header);
        }


        #fbte-title {

            flex:
                1;


            min-width:
                0;


            overflow:
                hidden;


            white-space:
                nowrap;


            font-weight:
                650;


            padding-left:
                5px;
        }


        /* =========================
           顶部按钮
           ========================= */

        .fbte-header-button {

            width:
                31px;


            height:
                31px;


            flex:
                0 0 31px;


            display:
                inline-flex;


            align-items:
                center;


            justify-content:
                center;


            border:
                0;


            outline:
                0;


            border-radius:
                7px;


            background:
                transparent;


            color:
                var(--text);


            cursor:
                pointer;


            font-size:
                15px;


            transition:
                background .12s ease;
        }


        .fbte-header-button:hover {

            background:
                var(--button-hover);
        }


        /* =========================
           目录区域
           ========================= */

        #fbte-tree {

            flex:
                1;


            min-height:
                0;


            overflow:
                auto;


            box-sizing:
                border-box;


            padding:
                7px 6px 30px;
        }


        #fbte-tree::-webkit-scrollbar {

            width:
                8px;
        }


        #fbte-tree::-webkit-scrollbar-thumb {

            background:
                var(--border);


            border-radius:
                8px;
        }


        /* =========================
           目录行
           ========================= */

        .fbte-row {

            height:
                32px;


            display:
                flex;


            align-items:
                center;


            box-sizing:
                border-box;


            border-radius:
                6px;


            cursor:
                pointer;


            white-space:
                nowrap;


            user-select:
                none;


            color:
                var(--text);
        }


        .fbte-row:hover {

            background:
                var(--hover);
        }


        .fbte-row.active {

            background:
                var(--active);


            color:
                var(--active-text);


            font-weight:
                600;
        }


        .fbte-toggle {

            width:
                23px;


            height:
                30px;


            flex:
                0 0 23px;


            border:
                0;


            background:
                transparent;


            color:
                var(--muted);


            cursor:
                pointer;


            font-size:
                10px;


            padding:
                0;
        }


        .fbte-folder {

            width:
                22px;


            flex:
                0 0 22px;


            text-align:
                center;
        }


        .fbte-label {

            flex:
                1;


            min-width:
                0;


            overflow:
                hidden;


            text-overflow:
                ellipsis;


            padding-right:
                6px;
        }


        .fbte-children {

            margin-left:
                15px;
        }


        .fbte-error {

            padding:
                5px 8px
                5px 25px;


            font-size:
                12px;


            color:
                #d93025;
        }


        /* =========================
           收起模式
           ========================= */

        #fbte-sidebar.collapsed
        #fbte-title {

            display:
                none;
        }


        #fbte-sidebar.collapsed
        #fbte-theme {

            display:
                none;
        }


        #fbte-sidebar.collapsed
        #fbte-pin {

            display:
                none;
        }


        #fbte-sidebar.collapsed
        #fbte-tree {

            display:
                none;
        }


        #fbte-sidebar.collapsed
        #fbte-header {

            padding:
                0;


            justify-content:
                center;
        }


        #fbte-sidebar.collapsed
        #fbte-collapse {

            width:
                36px;


            height:
                36px;


            flex:
                0 0 36px;


            background:
                var(--button);
        }


        /* =========================
           非固定 / 浮动模式
           ========================= */

        #fbte-sidebar:not(.pinned) {

            box-shadow:
                5px 0 20px
                rgba(
                    0,
                    0,
                    0,
                    .18
                );
        }

        `;


        document.head.appendChild(
            style
        );
    }


    // ==============================
    // 创建目录节点
    // ==============================

    function createNode(
        name,
        path
    ) {

        path =
            normalizePath(path);


        const wrapper =
            document.createElement(
                'div'
            );


        const row =
            document.createElement(
                'div'
            );


        row.className =
            'fbte-row';


        row.dataset.path =
            path;


        if (
            normalizePath(
                getCurrentPath()
            ) === path
        ) {

            row.classList.add(
                'active'
            );
        }


        // --------------------------
        // 箭头
        // --------------------------

        const toggle =
            document.createElement(
                'button'
            );


        toggle.type =
            'button';


        toggle.className =
            'fbte-toggle';


        // --------------------------
        // 文件夹图标
        // --------------------------

        const icon =
            document.createElement(
                'span'
            );


        icon.className =
            'fbte-folder';


        icon.textContent =
            '📁';


        // --------------------------
        // 文件名
        // --------------------------

        const label =
            document.createElement(
                'span'
            );


        label.className =
            'fbte-label';


        label.textContent =
            name;


        label.title =
            path;


        // --------------------------
        // 子目录
        // --------------------------

        const children =
            document.createElement(
                'div'
            );


        children.className =
            'fbte-children';


        let loaded =
            false;


        let expanded =
            expandedPaths.has(
                path
            );


        // ==========================
        // 展开
        // ==========================

        async function expand() {

            if (!loaded) {

                toggle.textContent =
                    '…';


                try {

                    const dirs =
                        await loadDirectories(
                            path
                        );


                    children.innerHTML =
                        '';


                    for (
                        const dir of dirs
                    ) {

                        const childPath =

                            path === '/'

                                ? '/' +
                                    dir.name

                                : path +
                                    '/' +
                                    dir.name;


                        children.appendChild(
                            createNode(
                                dir.name,
                                childPath
                            )
                        );
                    }


                    loaded =
                        true;


                } catch (error) {

                    console.error(
                        '[FBTE]',
                        error
                    );


                    children.innerHTML =
                        '<div class="fbte-error">目录读取失败</div>';
                }
            }


            expanded =
                true;


            children.hidden =
                false;


            toggle.textContent =
                '▼';


            expandedPaths.add(
                path
            );


            saveExpandedPaths(
                expandedPaths
            );
        }


        // ==========================
        // 折叠
        // ==========================

        function collapse() {

            expanded =
                false;


            children.hidden =
                true;


            toggle.textContent =
                '▶';


            expandedPaths.delete(
                path
            );


            saveExpandedPaths(
                expandedPaths
            );
        }


        // ==========================
        // 点击箭头
        // ==========================

        toggle.addEventListener(
            'click',
            async event => {

                event.stopPropagation();


                if (expanded) {

                    collapse();

                } else {

                    await expand();
                }
            }
        );


        // ==========================
        // 点击文件夹名称
        // ==========================

        row.addEventListener(
            'click',
            event => {

                if (
                    event.target ===
                    toggle
                ) {

                    return;
                }


                saveExpandedPaths(
                    expandedPaths
                );


                location.href =
                    fileURL(path);
            }
        );


        row.append(
            toggle,
            icon,
            label
        );


        wrapper.append(
            row,
            children
        );


        // ==========================
        // 恢复展开
        // ==========================

        if (expanded) {

            children.hidden =
                false;


            toggle.textContent =
                '▼';


            setTimeout(
                () => {

                    expand();

                },
                0
            );


        } else {

            children.hidden =
                true;


            toggle.textContent =
                '▶';
        }


        return wrapper;
    }


    // ==============================
    // 初始化
    // ==============================

    function init() {

        if (
            document.getElementById(
                'fbte-sidebar'
            )
        ) {

            return;
        }


        injectStyle();


        const sidebar =
            document.createElement(
                'aside'
            );


        sidebar.id =
            'fbte-sidebar';


        sidebar.innerHTML = `

            <div id="fbte-header">

                <div id="fbte-title">
                    📁 文件目录
                </div>


                <button
                    id="fbte-theme"
                    class="fbte-header-button"
                    type="button"
                    title="深浅色">
                </button>


                <button
                    id="fbte-pin"
                    class="fbte-header-button"
                    type="button"
                    title="固定侧栏">
                    📌
                </button>


                <button
                    id="fbte-collapse"
                    class="fbte-header-button"
                    type="button"
                    title="收起侧栏">
                    ◀
                </button>

            </div>


            <div id="fbte-tree">
            </div>

        `;


        document.body.appendChild(
            sidebar
        );


        // ==========================
        // Theme
        // ==========================

        document
            .getElementById(
                'fbte-theme'
            )
            .addEventListener(
                'click',
                () => {

                    const current =
                        sidebar.dataset
                            .theme;


                    applyTheme(
                        current === 'dark'

                            ? 'light'

                            : 'dark'
                    );
                }
            );


        // ==========================
        // Pin
        // ==========================

        document
            .getElementById(
                'fbte-pin'
            )
            .addEventListener(
                'click',
                event => {

                    event.stopPropagation();


                    sidebarPinned =
                        !sidebarPinned;


                    updateLayout();
                }
            );


        // ==========================
        // Collapse
        // ==========================

        document
            .getElementById(
                'fbte-collapse'
            )
            .addEventListener(
                'click',
                event => {

                    event.stopPropagation();


                    sidebarCollapsed =
                        !sidebarCollapsed;


                    updateLayout();
                }
            );


        applyTheme(
            getTheme()
        );


        const tree =
            document.getElementById(
                'fbte-tree'
            );


        tree.appendChild(
            createNode(
                '根目录',
                '/'
            )
        );


        updateLayout();


        // ==========================
        // 当前目录滚动至视野
        // ==========================

        setTimeout(
            () => {

                const active =
                    document.querySelector(
                        '.fbte-row.active'
                    );


                if (active) {

                    active.scrollIntoView(
                        {
                            block:
                                'center'
                        }
                    );
                }

            },
            500
        );


        // ==========================
        // 页面尺寸变化
        // ==========================

        window.addEventListener(
            'resize',
            updateLayout
        );
    }


    if (
        document.body
    ) {

        init();

    } else {

        window.addEventListener(
            'DOMContentLoaded',
            init
        );
    }

})();