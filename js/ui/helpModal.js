import { logKey } from './logger.js';

// 使用 Vite 的 glob 導入功能自動掃描文件
// 規則：public/docs/ 下的 *_readme_*.html
// 注意：Vite 的 import.meta.glob 路徑是相對於此 js 檔案的
// public 資料夾在開發時位於根目錄，但在 glob 中我們通常指向 src 或相對路徑
// 由於 public 中的檔案在 build 後會被複製到根目錄，這裡我們主要獲取 "開發時的檔案列表"
// 或者是直接列出 url。
// 修正：import.meta.glob 最好用於 src 下的模組。對於 public 下的靜態資源，
// 我們通常無法直接用 glob "遍歷" 它們，除非它們在 src 內。
// **重要調整**：為了讓 Vite 能追蹤，建議將 docs 移入 `src/docs`，或者我們保持在 public，
// 但利用一個已知清單或透過 fetch 一個索引檔。
// 但既然範例管理器能用 `../../src/examples/**/*.xml`，我們試試看能不能 glob public。
// 通常 public 內的檔案不參與 bundle，所以 glob 可能抓不到。
// **替代方案**：最穩健的方式是把這些文檔視為 src 的一部分 (move to src/docs)，或者我們在 exampleManager 看到它是 glob `../../src/examples`。
// 如果您的文件確實在 `SynthBlockly/public/docs`，在 Vite 中 glob `../../public/docs/*.html` 是可行的（開發模式）。
// 但在生產模式 (build) 後，這些檔案會被 copy 到 dist 根目錄，這時 import.meta.glob 的映射表依然有效（指向 assets）。

// 根據您的需求，我們嘗試 glob public 下的 readme
const docFiles = import.meta.glob('../../public/docs/*_readme_*.html', { query: '?url', import: 'default' });

// 定義左側選單的優先順序 (ID 為檔名中 _readme_ 之前的文字)
const HELP_ORDER = [
    'examples',
    'instrument',
    'performance',
    'melody',
    'step_sequencer',
    'transport',
    'effect',
    'custom_sampler'
];

// 用於快取已載入的內容
const contentCache = {};

let modal = null;
let currentLang = 'zh-hant'; // 預設語系，後續可從 localStorage 或 html lang 屬性取得

/**
 * 解析檔名以獲取標題與語系
 * 格式範例: xyz_for_abc_readme_zh-hant.html
 * 標題: Xyz For Abc
 * 語系: zh-hant
 */
function parseDocInfo(path) {
    // 提取檔名 (移除路徑)
    const filename = path.split('/').pop();
    
    // 移除副檔名
    const nameNoExt = filename.replace(/\.html$/, '');
    
    // 分割語系 (假設最後一個底線後是語系，且該語系可能包含 - )
    // Regex: 找最後一個 "_readme_"
    const parts = nameNoExt.split('_readme_');
    
    if (parts.length < 2) return null; // 不符合格式
    
    const titlePart = parts[0];
    const langPart = parts[1];
    
    // 格式化標題: "xyz_for_abc" -> "Xyz For Abc"
    const title = titlePart
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return {
        id: titlePart,
        title: title,
        lang: langPart,
        path: path, // 原始 glob key
        url: null   // 待解析
    };
}

/**
 * 準備文件列表
 */
async function getDocList() {
    const docs = [];
    
    for (const path in docFiles) {
        const info = parseDocInfo(path);
        if (info) {
            // 解析實際 URL (Vite 會處理)
            info.url = await docFiles[path]();
            docs.push(info);
        }
    }
    return docs;
}

function createHelpModal() {
    const modalDiv = document.createElement('div');
    modalDiv.id = 'helpModal';
    modalDiv.className = 'modal-backdrop';
    modalDiv.style.display = 'none';
    
    modalDiv.innerHTML = `
        <div class="modal-content help-modal-content">
            <span class="modal-close-button" id="closeHelpModal">&times;</span>
            <div class="help-layout">
                <div class="help-sidebar">
                    <h3>說明主題 (Topics)</h3>
                    <ul id="helpMenu"></ul>
                </div>
                <div class="help-body">
                    <div id="helpContent" class="help-article">
                        <div style="text-align:center; color:#666; margin-top:50px;">
                            請從左側選擇主題<br>Select a topic from the left
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    
    // CSS
    const style = document.createElement('style');
    style.textContent = `
        .help-modal-content {
            width: 90%;
            max-width: 1000px;
            height: 80vh;
            padding: 0; /* Reset padding for layout */
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .help-layout {
            display: flex;
            flex: 1;
            height: 100%;
            overflow: hidden;
        }
        
        .help-sidebar {
            width: 250px;
            background: #f5f5f5;
            border-right: 1px solid #ddd;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }
        
        .help-sidebar h3 {
            padding: 15px;
            margin: 0;
            background: #e0e0e0;
            font-size: 16px;
            color: #333;
            border-bottom: 1px solid #ccc;
        }
        
        #helpMenu {
            list-style: none;
            padding: 0;
            margin: 0;
            overflow-y: auto;
            flex: 1;
        }
        
        #helpMenu li {
            padding: 12px 15px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
            transition: background 0.2s;
            font-size: 14px;
            color: #444;
        }
        
        #helpMenu li:hover {
            background: #fff;
            color: #FE2F89; /* SynthBlockly Pink */
        }
        
        #helpMenu li.active {
            background: #fff;
            border-left: 4px solid #FE2F89;
            color: #FE2F89;
            font-weight: bold;
        }
        
        .help-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #fff;
        }
        
        .help-article {
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
        }
        
        /* 覆寫 modal close button 位置 */
        #helpModal .modal-close-button {
            top: 10px;
            right: 15px;
            z-index: 10;
            background: rgba(255,255,255,0.8);
            width: 30px;
            height: 30px;
            text-align: center;
            border-radius: 50%;
            line-height: 30px;
        }
    `;
    document.head.appendChild(style);

    // Events
    modalDiv.querySelector('#closeHelpModal').onclick = () => { modalDiv.style.display = 'none'; };
    window.addEventListener('click', (e) => {
        if (e.target == modalDiv) modalDiv.style.display = 'none';
    });

    return modalDiv;
}

/**
 * 載入並顯示特定文件內容
 */
async function loadDocContent(docItem) {
    const container = document.getElementById('helpContent');
    const menuItems = document.querySelectorAll('#helpMenu li');
    
    // Update Menu Active State
    menuItems.forEach(li => li.classList.remove('active'));
    const activeLi = Array.from(menuItems).find(li => li.dataset.id === docItem.id);
    if (activeLi) activeLi.classList.add('active');

    // Load Content
    container.innerHTML = '<div style="text-align:center; margin-top:50px;">載入中 (Loading)...</div>';
    
    try {
        let html = "";
        if (contentCache[docItem.url]) {
            html = contentCache[docItem.url];
        } else {
            const resp = await fetch(docItem.url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            html = await resp.text();
            contentCache[docItem.url] = html;
        }
        
        // 簡單處理：移除 head/body 標籤，只保留內容，避免樣式衝突
        // 或者使用 Shadow DOM (較複雜)。這裡我們假設 readme html 結構簡單。
        // 為了安全與樣式隔離，我們可以把內容包在一個 div 裡，或者用 iframe。
        // 考慮到 readme 內有 <style>，直接 innerHTML 可能會污染全域樣式。
        // 但 iframe 在 modal 裡有時會有捲動條問題。
        // 這裡採用直接 innerHTML，但建議 readme 的 css 要有 scope (如範例中的 body {...})
        // 為了防止 <style> body {} 影響主頁面，我們可以做一點正則替換
        
        const scopedHtml = html.replace(/body\s*{/g, '.help-article {'); 
        
        container.innerHTML = scopedHtml;
        
    } catch (e) {
        console.error("Doc load failed:", e);
        container.innerHTML = '<div style="color:red; text-align:center;">載入失敗 (Load Failed)</div>';
    }
}

export async function showHelpModal() {
    if (!modal) modal = createHelpModal();
    
    // 偵測語系 (優先使用 html lang，預設 zh-hant)
    const langAttr = document.documentElement.lang || 'zh-Hant';
    currentLang = langAttr.toLowerCase().includes('en') ? 'en' : 'zh-hant';
    
    // 取得並過濾文件列表
    const allDocs = await getDocList();
    
    // 取得唯一的 ID 並根據 HELP_ORDER 進行排序
    const uniqueIds = [...new Set(allDocs.map(d => d.id))].sort((a, b) => {
        const indexA = HELP_ORDER.indexOf(a);
        const indexB = HELP_ORDER.indexOf(b);
        
        // 若兩者都在自訂順序中，按順序排
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // 若只有其中一個在自訂順序中，該項排前面
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        // 若都不在順序中，則按字母排
        return a.localeCompare(b);
    });
    
    const displayList = [];
    
    uniqueIds.forEach(id => {
        const variants = allDocs.filter(d => d.id === id);
        let target = variants.find(d => d.lang === currentLang);
        if (!target) target = variants.find(d => d.lang === 'en'); // Fallback to English
        if (!target) target = variants[0]; // Fallback to whatever exists
        
        if (target) displayList.push(target);
    });

    // 渲染選單
    const menu = document.getElementById('helpMenu');
    menu.innerHTML = '';
    
    displayList.forEach(doc => {
        const li = document.createElement('li');
        li.textContent = doc.title;
        li.dataset.id = doc.id;
        li.onclick = () => loadDocContent(doc);
        menu.appendChild(li);
    });

    modal.style.display = 'flex';
    
    // 自動載入第一個主題 (如果有)
    if (displayList.length > 0) {
        // 如果還沒有內容被載入過，才載入第一個
        if (document.getElementById('helpContent').innerHTML.includes('選擇主題')) {
            loadDocContent(displayList[0]);
        }
    }
}