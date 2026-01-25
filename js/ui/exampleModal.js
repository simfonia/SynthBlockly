import { getExampleList, fetchTextContent } from '../core/exampleManager.js';
import * as Blockly from 'blockly';
import { resetWorkspaceAndAudio } from '../core/blocklyManager.js';
import { logKey } from './logger.js';

let modal = null;

function createExampleModal() {
    // 建立 HTML 結構
    const modalDiv = document.createElement('div');
    modalDiv.id = 'exampleModal';
    modalDiv.className = 'modal-backdrop';
    modalDiv.style.display = 'none';
    
    // 標題也支援多語系，這裡暫時 hardcode 中文，因為專案主要為中文
    modalDiv.innerHTML = `
        <div class="modal-content" style="max-width: 800px; width: 80%;">
            <span class="modal-close-button" id="closeExampleModal">&times;</span>
            <h2 data-lang-text="UI_EXAMPLES_TITLE">範例專案 (Examples)</h2>
            <div id="exampleList" class="example-list-container"></div>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    
    // CSS 樣式
    const style = document.createElement('style');
    style.textContent = `
        .example-list-container {
            max-height: 60vh;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 15px;
            padding: 10px;
        }
        .example-item {
            background: #fff;
            padding: 15px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            border: 1px solid #e0e0e0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .example-item:hover {
            border-color: #FE2F89;
            transform: translateY(-3px);
            box-shadow: 0 4px 8px rgba(254, 47, 137, 0.2);
        }
        .example-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }
        .example-name {
            font-weight: 600;
            color: #333;
            font-size: 1.1em;
            margin-bottom: 5px;
        }
        .example-tag {
            font-size: 0.75em;
            padding: 2px 8px;
            border-radius: 10px;
            color: #fff;
            background-color: #999;
        }
        .tag-hardware {
            background-color: #FE2F89; /* SynthBlockly pink */
        }
        .tag-software {
            background-color: #4CAF50;
        }

        /* Hardware Modal specific */
        .hardware-info-content {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 15px;
            border-radius: 4px;
            overflow: auto;
            max-height: 40vh;
            font-family: 'Consolas', 'Monaco', monospace;
            white-space: pre;
            font-size: 14px;
            border: 1px solid #333;
        }
        .hw-desc-box {
            background: #f9f9f9;
            border-left: 4px solid #FE2F89;
            padding: 10px 15px;
            margin-bottom: 15px;
            color: #555;
        }
        .ui-btn {
            background-color: #FE2F89;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        .ui-btn:hover {
            background-color: #d61c6b;
        }
    `;
    document.head.appendChild(style);

    // 綁定關閉事件
    const closeBtn = modalDiv.querySelector('#closeExampleModal');
    closeBtn.onclick = () => { modalDiv.style.display = 'none'; };
    
    // 點擊背景關閉
    window.addEventListener('click', (event) => {
        if (event.target == modalDiv) {
            modalDiv.style.display = 'none';
        }
    });

    return modalDiv;
}

function createHardwareModal() {
    // 檢查是否已存在
    let hwModal = document.getElementById('hardwareInfoModal');
    if (!hwModal) {
        hwModal = document.createElement('div');
        hwModal.id = 'hardwareInfoModal';
        hwModal.className = 'modal-backdrop';
        hwModal.style.display = 'none';
        hwModal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; width: 90%;">
                <span class="modal-close-button" id="closeHwModal">&times;</span>
                <h2>🔌 硬體設定指引 (Hardware Setup)</h2>
                
                <div class="hw-desc-box">
                    <p><strong>注意：</strong> 此範例需要搭配 Arduino 開發板與特定電路。</p>
                    <p>請下載下方的 .ino 檔案並燒錄至您的 Arduino。</p>
                </div>

                <div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
                   <button id="downloadInoBtn" class="ui-btn">📥 下載 Arduino 程式碼 (.ino)</button>
                   <span id="hwFilenameDisplay" style="color:#666; font-size:0.9em;"></span>
                </div>

                <div id="hwReadmeContent" style="margin-bottom: 15px; padding: 10px; background:#fff; border:1px solid #eee; display:none;"></div>

                <h3 style="margin-top:20px;">程式碼預覽 (Code Preview)</h3>
                <div id="hwCodePreview" class="hardware-info-content"></div>
            </div>
        `;
        document.body.appendChild(hwModal);
        
        hwModal.querySelector('#closeHwModal').onclick = () => hwModal.style.display = 'none';
        
        // 點擊背景關閉
        hwModal.addEventListener('click', (e) => {
            if (e.target === hwModal) hwModal.style.display = 'none';
        });
    }
    return hwModal;
}

export async function showExampleModal() {
    if (!modal) modal = createExampleModal();
    
    const listContainer = modal.querySelector('#exampleList');
    listContainer.innerHTML = '<div style="text-align:center; width:100%; grid-column: 1/-1;">載入中 (Loading)...</div>';
    modal.style.display = 'flex';

    try {
        const examples = getExampleList();
        listContainer.innerHTML = '';
        
        if (examples.length === 0) {
            listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center;">沒有找到範例。<br>No examples found.</div>';
            return;
        }

        examples.forEach(ex => {
            const item = document.createElement('div');
            item.className = 'example-item';
            
            const isHw = ex.type === 'hardware';
            const icon = isHw ? '🤖' : '🎹';
            const tagClass = isHw ? 'tag-hardware' : 'tag-software';
            const tagText = isHw ? 'Hardware + Code' : 'Blockly Only';
            
            // 提取序號並格式化顯示標題
            const match = ex.id.match(/^(\d+(?:[-.]\d+)?)/);
            let displayTitle = ex.name;
            if (match) {
                const indexStr = match[1].replace(/^0+/, ''); // 去掉開頭的 0，如 01 -> 1
                displayTitle = `範例 ${indexStr}: ${ex.name}`;
            }

            item.innerHTML = `
                <span class="example-icon">${icon}</span>
                <span class="example-name">${displayTitle}</span>
                <span class="example-tag ${tagClass}">${tagText}</span>
            `;
            
            item.onclick = () => loadExample(ex);
            listContainer.appendChild(item);
        });

    } catch (e) {
        console.error(e);
        listContainer.innerHTML = '<div style="color:red; grid-column: 1/-1;">載入失敗 (Load Failed)</div>';
    }
}

async function loadExample(example) {
    if (confirm(`確定要載入範例 "${example.name}" 嗎？\n目前的程式碼將會被覆蓋。\nAre you sure you want to load "${example.name}"?`)) {
        try {
            // 1. 下載 XML
            const xmlText = await fetchTextContent(example.xmlUrl);
            
            // 2. 重置並載入 (V2.1: skipTemplate = true)
            resetWorkspaceAndAudio(true);
            const xml = Blockly.utils.xml.textToDom(xmlText);
            Blockly.Xml.domToWorkspace(xml, Blockly.getMainWorkspace());
            logKey('LOG_XML_LOADED', 'info', example.name);
            
            // 關閉列表
            modal.style.display = 'none';

            // 3. 如果是硬體範例，顯示硬體指引
            if (example.type === 'hardware' && example.arduinoUrl) {
                showHardwareInfo(example);
            }
            
        } catch (e) {
            logKey('LOG_XML_LOAD_ERR', 'error', e);
            console.error(e);
            alert('載入失敗 (Load Failed)。');
        }
    }
}

async function showHardwareInfo(example) {
    const hwModal = createHardwareModal();
    const codePreview = hwModal.querySelector('#hwCodePreview');
    const dlBtn = hwModal.querySelector('#downloadInoBtn');
    const readmeDiv = hwModal.querySelector('#hwReadmeContent');
    const filenameDisp = hwModal.querySelector('#hwFilenameDisplay');
    
    codePreview.textContent = "正在讀取程式碼...";
    hwModal.style.display = 'flex';

    try {
        const code = await fetchTextContent(example.arduinoUrl);
        codePreview.textContent = code;
        filenameDisp.textContent = `(${example.id}.ino)`;
        
        // 設定下載按鈕
        dlBtn.onclick = () => {
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${example.id}.ino`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        };

        // 如果有 README，嘗試讀取
        if (example.readmeUrl) {
            try {
                const readmeText = await fetchTextContent(example.readmeUrl);
                // 簡單的 markdown 轉換 (僅支援粗體和標題，避免引入 heavy library)
                // 如果需要完整支援，建議之後引入 marked.js
                let html = readmeText
                    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
                    .replace(/\n/gim, '<br>');
                
                readmeDiv.innerHTML = html;
                readmeDiv.style.display = 'block';
            } catch (err) {
                console.warn("Readme load failed", err);
                readmeDiv.style.display = 'none';
            }
        } else {
            readmeDiv.style.display = 'none';
        }

    } catch (e) {
        codePreview.textContent = "無法讀取 Arduino 程式碼 (Failed to load code)。";
        console.error(e);
    }
}
