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

    // 掛載至各個可能的位置
    try { if (Gproto) Gproto['sb_comment'] = G['sb_comment']; } catch (e) { }
    try { G.forBlock['sb_comment'] = G['sb_comment']; } catch (e) { }

    return true;
}
