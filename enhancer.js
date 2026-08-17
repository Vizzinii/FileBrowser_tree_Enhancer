// ==UserScript==
// @name         FileBrowser Tree Enhancer
// @author       vizzini
// @namespace    local.filebrowser.tree
// @version      0.4
// @description  File Browser Octotree 风格目录树 / 保持展开 / 深浅色
// @match        http://192.168.3.138:8080/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const WIDTH = 280;

    const THEME_KEY = 'fbte-theme';
    const EXPANDED_KEY = 'fbte-expanded-folders';

    // =========================
    // 展开状态
    // =========================

    function getExpandedPaths() {
        try {
            const value =
                JSON.parse(
                    localStorage.getItem(EXPANDED_KEY) || '[]'
                );

            return new Set(
                Array.isArray(value) ? value : []
            );

        } catch (_) {
            return new Set();
        }
    }

    function saveExpandedPaths(set) {
        localStorage.setItem(
            EXPANDED_KEY,
            JSON.stringify([...set])
        );
    }

    const expandedPaths =
        getExpandedPaths();

    // =========================
    // 当前目录
    // =========================

    function getCurrentPath() {
        const index =
            location.pathname.indexOf('/files');

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
            path.replace(/\/+$/, '');

        return path || '/';
    }

    function normalizePath(path) {
        if (!path) {
            return '/';
        }

        if (path !== '/') {
            path =
                path.replace(/\/+$/, '');
        }

        return path || '/';
    }

    // =========================
    // 当前路径所有父目录
    // 自动加入展开列表
    // =========================

    function addCurrentParents() {
        const current =
            normalizePath(
                getCurrentPath()
            );

        expandedPaths.add('/');

        if (current === '/') {
            return;
        }

        const parts =
            current
                .split('/')
                .filter(Boolean);

        let path = '';

        for (const part of parts) {
            path += '/' + part;

            // 当前目录本身不一定需要展开
            // 父目录需要展开
            if (path !== current) {
                expandedPaths.add(path);
            }
        }

        saveExpandedPaths(
            expandedPaths
        );
    }

    addCurrentParents();

    // =========================
    // URL / API
    // =========================

    function encodePath(path) {
        if (path === '/') {
            return '/';
        }

        return path
            .split('/')
            .map(
                (part, i) =>
                    i === 0
                        ? ''
                        : encodeURIComponent(part)
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

    // =========================
    // FileBrowser API
    // =========================

    async function loadDirectories(path) {
        const jwt =
            localStorage.getItem('jwt');

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
                `目录读取失败：HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        return (
            Array.isArray(data.items)
                ? data.items
                : []
        )
            .filter(
                item =>
                    item &&
                    (
                        item.isDir === true ||
                        item.type === 'directory' ||
                        item.type === 'dir'
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

    // =========================
    // Theme
    // =========================

    function getTheme() {
        const saved =
            localStorage.getItem(
                THEME_KEY
            );

        if (
            saved === 'light' ||
            saved === 'dark'
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
                    ? '☀️'
                    : '🌙';
        }
    }

    // =========================
    // CSS
    // =========================

    function injectStyle() {
        const style =
            document.createElement(
                'style'
            );

        style.textContent = `

        #fbte-sidebar {

            --bg: #ffffff;
            --bg2: #f5f5f5;
            --text: #252525;
            --muted: #777;
            --border: #dedede;

            --hover: #f1f3f4;
            --active: #e8f0fe;
            --active-text: #1967d2;

            position: fixed;

            left: 0;
            top: 0;
            bottom: 0;

            width: ${WIDTH}px;

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

            font-family:
                system-ui,
                -apple-system,
                "Segoe UI",
                "Microsoft YaHei",
                sans-serif;

            font-size:
                14px;

            box-shadow:
                2px 0 8px
                rgba(0,0,0,.06);
        }

        #fbte-sidebar[data-theme="dark"] {

            --bg: #1e1f21;
            --bg2: #292b2f;

            --text: #e7e7e7;
            --muted: #aaa;

            --border: #393b40;

            --hover: #292c31;

            --active: #263850;
            --active-text: #8ab4f8;
        }

        #fbte-header {

            height: 52px;

            flex:
                0 0 52px;

            display:
                flex;

            align-items:
                center;

            padding:
                0 10px 0 14px;

            border-bottom:
                1px solid
                var(--border);
        }

        #fbte-title {

            flex: 1;

            font-weight:
                650;
        }

        #fbte-theme {

            width: 34px;
            height: 34px;

            border: 0;

            border-radius:
                7px;

            cursor:
                pointer;

            background:
                var(--bg2);
        }

        #fbte-tree {

            flex: 1;

            overflow:
                auto;

            padding:
                8px 6px 30px;
        }

        .fbte-row {

            display:
                flex;

            align-items:
                center;

            height:
                32px;

            border-radius:
                6px;

            cursor:
                pointer;

            white-space:
                nowrap;

            user-select:
                none;
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
                24px;

            height:
                30px;

            flex:
                0 0 24px;

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
        }

        .fbte-folder {

            width:
                23px;

            flex:
                0 0 23px;
        }

        .fbte-label {

            overflow:
                hidden;

            text-overflow:
                ellipsis;

            flex: 1;

            padding-right:
                8px;
        }

        .fbte-children {

            margin-left:
                16px;
        }

        .fbte-error {

            padding:
                5px 8px 5px 25px;

            color:
                #d93025;

            font-size:
                12px;
        }

        body {

            padding-left:
                ${WIDTH}px !important;

            box-sizing:
                border-box !important;
        }

        `;

        document.head.appendChild(
            style
        );
    }

    // =========================
    // 创建目录节点
    // =========================

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

        const toggle =
            document.createElement(
                'button'
            );

        toggle.className =
            'fbte-toggle';

        toggle.type =
            'button';

        const icon =
            document.createElement(
                'span'
            );

        icon.className =
            'fbte-folder';

        icon.textContent =
            '📁';

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

        const children =
            document.createElement(
                'div'
            );

        children.className =
            'fbte-children';

        let loaded =
            false;

        let expanded =
            expandedPaths.has(path);

        // =========================
        // 加载并展开
        // =========================

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
                                ? '/' + dir.name
                                : path + '/' + dir.name;

                        children.appendChild(
                            createNode(
                                dir.name,
                                childPath
                            )
                        );
                    }

                    loaded = true;

                } catch (error) {

                    console.error(
                        '[FBTE]',
                        error
                    );

                    children.innerHTML =
                        '<div class="fbte-error">目录读取失败</div>';
                }
            }

            expanded = true;

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

        // =========================
        // 点击目录名称
        // =========================

        row.addEventListener(
            'click',
            event => {

                if (
                    event.target ===
                    toggle
                ) {
                    return;
                }

                // 跳转前保存
                // 当前树的展开状态
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

        // =========================
        // 页面重新打开以后
        // 自动恢复
        // =========================

        if (expanded) {

            children.hidden =
                false;

            toggle.textContent =
                '▼';

            // 让 DOM 创建完成以后加载
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

    // =========================
    // 初始化
    // =========================

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
                    type="button">
                </button>

            </div>

            <div id="fbte-tree">
            </div>

        `;

        document.body.appendChild(
            sidebar
        );

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

        // 当前选中的文件夹滚动到视野内
        setTimeout(
            () => {

                const active =
                    document.querySelector(
                        '.fbte-row.active'
                    );

                if (active) {

                    active.scrollIntoView({
                        block:
                            'center'
                    });
                }
            },
            400
        );
    }

    if (document.body) {
        init();
    } else {

        window.addEventListener(
            'DOMContentLoaded',
            init
        );
    }

})();