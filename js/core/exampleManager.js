
// js/core/exampleManager.js
// 使用 Vite 的 import.meta.glob 取得檔案路徑 (as: 'url')
// 注意：路徑是相對於此檔案的
const xmlFiles = import.meta.glob('../../src/examples/**/*.xml', { eager: true, query: '?url', import: 'default' });
const inoFiles = import.meta.glob('../../src/examples/**/*.ino', { eager: true, query: '?url', import: 'default' });
const mdFiles = import.meta.glob('../../src/examples/**/*.md', { eager: true, query: '?url', import: 'default' });

/**
 * 格式化顯示名稱
 * e.g., "09_wah-wah" -> "Wah Wah"
 */
function formatName(name) {
    // 移除開頭的數字序號 (如 "01_" 或 "09.")
    const cleanName = name.replace(/^\d+[-_.]?/, '');
    return cleanName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * 取得範例列表
 * @returns {Array} 範例物件陣列
 */
export function getExampleList() {
    const examples = [];

    for (const path in xmlFiles) {
        const parts = path.split('/');
        const fileName = parts.pop();
        const folderName = parts[parts.length - 1]; // 上一層資料夾名稱 (可能是 examples 或 子資料夾名)
        const grandParentName = parts[parts.length - 2]; // 上上層 (可能是 src)
        
        // 判斷是否在子資料夾中
        // 路徑範例: ../../src/examples/folder/file.xml -> folderName = folder, grandParent = examples
        // 路徑範例: ../../src/examples/file.xml -> folderName = examples, grandParent = src
        
        const isInSubfolder = folderName !== 'examples'; 

        let exampleObj = null;

        if (isInSubfolder) {
            // 資料夾型範例
            // 規則：必須是 main.xml 或是 與資料夾同名的 xml 才視為入口
            const isMainXml = fileName === 'main.xml' || 
                              fileName.toLowerCase().replace('.xml', '') === folderName.toLowerCase();

            if (isMainXml) {
                 // 尋找同目錄下的 ino 和 md
                 const folderPath = path.substring(0, path.lastIndexOf('/'));
                 
                 // 簡易匹配：只要 path 開頭相同即可
                 const inoKey = Object.keys(inoFiles).find(k => k.startsWith(folderPath));
                 const mdKey = Object.keys(mdFiles).find(k => k.startsWith(folderPath));

                 exampleObj = {
                     id: folderName, 
                     name: formatName(folderName),
                     xmlUrl: xmlFiles[path],
                     type: inoKey ? 'hardware' : 'software',
                     arduinoUrl: inoKey ? inoFiles[inoKey] : null,
                     readmeUrl: mdKey ? mdFiles[mdKey] : null
                 };
            }
        } else {
            // 單檔型範例 (直接在 examples/ 下)
             const name = fileName.replace('.xml', '');
             exampleObj = {
                 id: name,
                 name: formatName(name),
                 xmlUrl: xmlFiles[path],
                 type: 'software',
                 arduinoUrl: null,
                 readmeUrl: null
             };
        }

        if (exampleObj) {
            examples.push(exampleObj);
        }
    }
    
    // 排序：嘗試解析開頭的數字
    examples.sort((a, b) => {
        // 從原始 ID 提取數字，例如 "09_Wah" -> 9
        const getNum = (str) => {
            const match = str.match(/^(\d+)/);
            return match ? parseInt(match[1]) : 999;
        };
        
        const numA = getNum(a.id);
        const numB = getNum(b.id);
        
        if (numA !== numB) return numA - numB;
        return a.name.localeCompare(b.name);
    });

    return examples;
}

/**
 * 讀取文字檔案內容
 */
export async function fetchTextContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (e) {
        console.error("Failed to load example content:", e);
        throw e;
    }
}
