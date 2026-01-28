// js/blocks/instruments_generators.js

export function registerGenerators(Blockly, javascriptGenerator) {
    if (typeof Blockly === 'undefined' || typeof javascriptGenerator === 'undefined') {
        console.error('javascriptGenerator not available');
        return false;
    }
    var G = javascriptGenerator;

    if (!G.definitions_) G.definitions_ = Object.create(null);
    if (!G.setups_) G.setups_ = Object.create(null);

    // Initialize forBlock if needed
    if (!G.forBlock) G.forBlock = {};

    /**
     * Helper to find the nearest container's instrument name.
     */
    function getContainerTarget(block) {
        let p = block.getSurroundParent();
        while (p) {
            if (p.type === 'sb_instrument_container') return p.getFieldValue('NAME') || 'MyInstrument';
            if (p.type === 'sb_master_container') return 'Master';
            p = p.getSurroundParent();
        }
        return 'DefaultSynth'; 
    }

    G['sb_play_note'] = function (block) {
        var note = G.valueToCode(block, 'NOTE', G.ORDER_ATOMIC) || "60";
        var dur = block.getFieldValue('DUR') || '8n';
        var velocity = `Number(${G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || 1})`;
        var processedNote = `window.audioEngine.Tone.Midi(${note}).toNote()`;
        return `window.audioEngine.playCurrentInstrumentNote(${processedNote}, '${dur}', (typeof scheduledTime !== 'undefined' ? scheduledTime : undefined), ${velocity});\n`;
    }.bind(G);
    try { G.forBlock['sb_play_note'] = G['sb_play_note']; } catch (e) { }

    G['sb_play_note_and_wait'] = function (block) {
        var note = G.valueToCode(block, 'NOTE', G.ORDER_ATOMIC) || "60";
        var dur = block.getFieldValue('DUR') || '4n';
        var velocity = `Number(${G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || 1})`;
        var processedNote = `window.audioEngine.Tone.Midi(${note}).toNote()`;
        return `await window.audioEngine.playCurrentInstrumentNote(${processedNote}, '${dur}', (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()), ${velocity});\nawait new Promise(resolve => setTimeout(resolve, window.audioEngine.Tone.Time('${dur}').toMilliseconds()));\nif (!window.audioEngine.isExecutionActive) return;\n`;
    }.bind(G);
    try { G.forBlock['sb_play_note_and_wait'] = G['sb_play_note_and_wait']; } catch (e) { }

    G['sb_play_drum'] = function (block) {
        var type = block.getFieldValue('TYPE');
        var velocity = `Number(${G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || 1})`;
        if (type === 'KICK') return `window.audioEngine.playKick(${velocity}, (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()));\n`;
        if (type === 'SNARE') return `window.audioEngine.playSnare(${velocity}, (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()));\n`;
        if (type === 'HH') return `window.audioEngine.hh.triggerAttackRelease('16n', (typeof scheduledTime !== 'undefined' ? scheduledTime : window.audioEngine.Tone.now()), ${velocity});\n`;
        return '';
    }.bind(G);
    try { G.forBlock['sb_play_drum'] = G['sb_play_drum']; } catch (e) { }

    G['jazzkit_play_drum'] = function (block) {
        var drumNote = block.getFieldValue('DRUM_TYPE');
        var velocity = `Number(${G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || 1})`;
        return `window.audioEngine.playJazzKitNote('${drumNote}', ${velocity}, (typeof scheduledTime !== 'undefined' ? scheduledTime : undefined));\n`;
    }.bind(G);
    try { G.forBlock['jazzkit_play_drum'] = G['jazzkit_play_drum']; } catch (e) { }

    G['sb_create_synth_instrument'] = function (block) {
        const name = getContainerTarget(block);
        const nameQuote = G.quote_(name);
        const type = G.quote_(block.getFieldValue('TYPE') || 'PolySynth');
        const reserved = ['KICK', 'SNARE', 'HH', 'CLAP'];
        if (reserved.includes(name.toUpperCase())) {
            return `window.audioEngine.logKey('LOG_RESERVED_NAME_ERR', 'error', '${name}');\n`;
        }
        return `window.audioEngine.createInstrument(${nameQuote}, ${type});\n`;
    }.bind(G);
    try { G.forBlock['sb_create_synth_instrument'] = G['sb_create_synth_instrument']; } catch (e) { }

    G['sb_create_layered_instrument'] = function (block) {
        const name = block.getFieldValue('NAME') || 'MyLayered';
        const layers = block.getFieldValue('LAYER_LIST') || "";
        const layersArray = JSON.stringify(layers.split(',').map(s => s.trim()).filter(s => s.length > 0));
        const reserved = ['KICK', 'SNARE', 'HH', 'CLAP'];
        if (reserved.includes(name.toUpperCase())) {
            return `window.audioEngine.logKey('LOG_RESERVED_NAME_ERR', 'error', '${name}');\n`;
        }
        return `window.audioEngine.createLayeredInstrument('${name}', ${layersArray});\n`;
    }.bind(G);
    try { G.forBlock['sb_create_layered_instrument'] = G['sb_create_layered_instrument']; } catch (e) { }

    // --- V2.1 Containers Generators ---
    G['sb_instrument_container'] = function (block) {
        const name = block.getFieldValue('NAME') || 'MyInstrument';
        const reserved = ['KICK', 'SNARE', 'HH', 'CLAP'];
        if (reserved.includes(name.toUpperCase())) {
            return `window.audioEngine.logKey('LOG_RESERVED_NAME_ERR', 'error', '${name}');\n`;
        }
        const branch = G.statementToCode(block, 'STACK');
        return `/* INSTRUMENT_DEFINITION:${name} */\n${branch}\n`;
    }.bind(G);
    try { G.forBlock['sb_instrument_container'] = G['sb_instrument_container']; } catch (e) { }

    G['sb_master_container'] = function (block) {
        const branch = G.statementToCode(block, 'STACK');
        return `/* MASTER_DEFINITION */\n${branch}\n`;
    }.bind(G);
    try { G.forBlock['sb_master_container'] = G['sb_master_container']; } catch (e) { }

    G['sb_container_adsr'] = function (block) {
        const target = getContainerTarget(block);
        const a = block.getFieldValue('A'), d = block.getFieldValue('D'), s = block.getFieldValue('S'), r = block.getFieldValue('R');
        return `(function(){ const t='${target}'; const engine=window.audioEngine; const instr=engine.instruments[t]; if(instr){ const settings={attack:${a},decay:${d},sustain:${s},release:${r},decayCurve:'linear',releaseCurve:'linear'}; engine.instrumentSettings[t]={...settings}; if(instr.set) instr.set({envelope:settings}); if(instr.get&&instr.get().voice0) instr.set({voice0:{envelope:settings},voice1:{envelope:settings}}); if(engine.currentInstrumentName===t) engine.syncAdsrToUI(); engine.logKey('LOG_ADSR_SET_INSTR','info',t); } })();\n`;
    }.bind(G);
    try { G.forBlock['sb_container_adsr'] = G['sb_container_adsr']; } catch (e) { }

    G['sb_container_volume'] = function (block) {
        const target = getContainerTarget(block);
        const vol = G.valueToCode(block, 'VOLUME_VALUE', G.ORDER_ATOMIC) || '1';
        return `(function(){ const t='${target}'; const v=Number(${vol}); const db=window.audioEngine.Tone.gainToDb(v); const chan=window.audioEngine._getOrCreateChannel(t); if(chan&&chan.volume) chan.volume.value=db; })();\n`;
    }.bind(G);
    try { G.forBlock['sb_container_volume'] = G['sb_container_volume']; } catch (e) { }

    G['sb_container_vibrato'] = function (block) {
        const target = getContainerTarget(block);
        const val = G.valueToCode(block, 'DETUNE_VALUE', G.ORDER_ATOMIC) || '0';
        return `(function(){ const t='${target}'; const instr=window.audioEngine.instruments[t]; if(instr&&instr.set) instr.set({detune:Number(${val})}); })();\n`;
    }.bind(G);
    try { G.forBlock['sb_container_vibrato'] = G['sb_container_vibrato']; } catch (e) { }

    G['sb_container_mute'] = function (block) {
        const target = getContainerTarget(block);
        const mute = block.getFieldValue('MUTE') === 'TRUE';
        return `(function(){ const chan=window.audioEngine._getOrCreateChannel('${target}'); if(chan) chan.mute=${mute}; })();\n`;
    }.bind(G);
    try { G.forBlock['sb_container_mute'] = G['sb_container_mute']; } catch (e) { }

    G['sb_container_solo'] = function (block) {
        const target = getContainerTarget(block);
        const solo = block.getFieldValue('SOLO') === 'TRUE';
        return `(function(){ const chan=window.audioEngine._getOrCreateChannel('${target}'); if(chan) chan.solo=${solo}; })();\n`;
    }.bind(G);
    try { G.forBlock['sb_container_solo'] = G['sb_container_solo']; } catch (e) { }

    G['sb_define_chord'] = function (block) {
        var name = block.getFieldValue('NAME');
        var notesStr = block.getFieldValue('NOTES_STRING') || "";
        var notesJson = JSON.stringify(notesStr.split(',').map(s => s.trim()).filter(s => s.length > 0));
        const reserved = ['KICK', 'SNARE', 'HH', 'CLAP'];
        if (reserved.includes(name.toUpperCase())) {
            return `window.audioEngine.logKey('LOG_RESERVED_NAME_ERR', 'error', '${name}');\n`;
        }
        return `(function(){ window.audioEngine.chords['${name}'] = ${notesJson}; window.audioEngine.logKey('LOG_CHORD_DEFINED', 'info', '${name}', '${notesStr}'); })();\n`;
    }.bind(G);
    try { G.forBlock['sb_define_chord'] = G['sb_define_chord']; } catch (e) { }

    G['sb_get_chord_name'] = function (block) { return [`'${block.getFieldValue('NAME')}'`, G.ORDER_ATOMIC]; }.bind(G);
    try { G.forBlock['sb_get_chord_name'] = G['sb_get_chord_name']; } catch (e) { }

    G['sb_play_chord_by_name'] = function (block) {
        var name = G.quote_(block.getFieldValue('CHORD_NAME')), dur = G.quote_(block.getFieldValue('DUR')), vel = `Number(${G.valueToCode(block, 'VELOCITY', G.ORDER_ATOMIC) || '1'})`;
        return `window.audioEngine.playChordByName(${name}, ${dur}, ${vel});\n`;
    };
    try { G.forBlock['sb_play_chord_by_name'] = G['sb_play_chord_by_name']; } catch (e) { }

    return true;
}