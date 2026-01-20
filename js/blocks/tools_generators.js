// js/blocks/tools_generators.js
export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        return false;
    }
    var G = javascriptGenerator;

    // 取得 Gproto 以確保相容性
    var Gproto = Object.getPrototypeOf(G) || (G.constructor && G.constructor.prototype) || null;
    if (!G.forBlock) G.forBlock = {};

    // 註解積木產生器：直接回傳空字串
    G['sb_comment'] = function (block) {
        return '';
    };

    G['sb_console_log'] = function (block) {
        const msg = G.valueToCode(block, 'MSG', G.ORDER_NONE) || "''";
        // Use console.log for now, or window.audioEngine.logKey if available?
        // Let's use console.log as it's safer and requested by user for "log".
        // But to show in UI, we should use audioEngine.log
        return `window.audioEngine.log('Debug: ' + ${msg}, 'info');\n`;
    };

    // 掛載至各個可能的位置
    try { if (Gproto) Gproto['sb_comment'] = G['sb_comment']; } catch (e) { }
    try { G.forBlock['sb_comment'] = G['sb_comment']; } catch (e) { }

    try { if (Gproto) Gproto['sb_console_log'] = G['sb_console_log']; } catch (e) { }
    try { G.forBlock['sb_console_log'] = G['sb_console_log']; } catch (e) { }

    return true;
}
