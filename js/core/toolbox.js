// js/core/toolbox.js

/**
 * The XML content of the toolbox.
 * By centralizing it here, we keep the blocklyManager.js file clean.
 */
export const TOOLBOX_XML_STRING = `
<xml id="toolbox" style="display: none">
    <category name="%{BKY_MSG_LOGIC_CATEGORY}" colour="%{BKY_LOGIC_HUE}">
        <block type="controls_if"></block>
        <block type="logic_compare"></block>
        <block type="logic_operation"></block>
        <block type="logic_negate"></block>
        <block type="logic_boolean"></block>
        <block type="logic_null"></block>
        <block type="logic_ternary"></block>
    </category>
    <category name="%{BKY_MSG_LOOPS_CATEGORY}" colour="%{BKY_LOOPS_HUE}">
        <block type="controls_repeat_ext">
            <value name="TIMES">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        <block type="controls_whileUntil"></block>
        <block type="controls_for">
            <value name="FROM">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
            <value name="TO">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
            <value name="BY">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
        </block>
        <block type="controls_forEach"></block>
        <block type="controls_flow_statements"></block>
    </category>
    <category name="%{BKY_MSG_MATH_CATEGORY}" colour="%{BKY_MATH_HUE}">
        <block type="math_number"></block>
        <block type="math_arithmetic">
            <value name="A">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
            <value name="B">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
        </block>
        <block type="math_single"></block>
        <block type="math_trig"></block>
        <block type="math_constant"></block>
        <block type="math_number_property"></block>
        <block type="math_round"></block>
        <block type="math_on_list"></block>
        <block type="math_modulo"></block>
        <block type="math_constrain">
            <value name="VALUE"></value>
            <value name="LOW">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
            <value name="HIGH">
                <shadow type="math_number">
                    <field name="NUM">100</field>
                </shadow>
            </value>
        </block>
        <block type="math_random_int">
            <value name="FROM">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
            <value name="TO">
                <shadow type="math_number">
                    <field name="NUM">100</field>
                </value>
            </value>
        </block>
        <block type="math_random_float"></block>
        <block type="math_map">
            <value name="VALUE"></value>
            <value name="FROM_LOW">
                <shadow type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
            <value name="FROM_HIGH">
                <shadow type="math_number">
                    <field name="NUM">1023</field>
                </shadow>
            </value>
            <value name="TO_LOW">
                <shadow type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
            <value name="TO_HIGH">
                <shadow type="math_number">
                    <field name="NUM">100</field>
                </shadow>
            </value>
        </block>
    </category>
    <category name="%{BKY_MSG_TEXT_CATEGORY}" colour="%{BKY_TEXTS_HUE}">
        <block type="text"></block>
        <block type="text_join"></block>
        <block type="text_append">
            <value name="TEXT">
                <shadow type="text"></shadow>
            </value>
        </block>
        <block type="text_length"></block>
        <block type="text_isEmpty"></block>
        <block type="text_indexOf"></block>
        <block type="text_charAt"></block>
        <block type="text_getSubstring"></block>
        <block type="text_changeCase"></block>
        <block type="text_trim"></block>
        <block type="text_print"></block>
        <block type="text_prompt_ext"></block>
    </category>
    <category name="%{BKY_MSG_LISTS_CATEGORY}" colour="%{BKY_LISTS_HUE}">
        <block type="lists_create_empty"></block>
        <block type="lists_create_with"></block>
        <block type="lists_repeat">
            <value name="NUM">
                <shadow type="math_number">
                    <field name="NUM">5</field>
                </shadow>
            </value>
        </block>
        <block type="lists_length"></block>
        <block type="lists_isEmpty"></block>
        <block type="lists_indexOf"></block>
        <block type="lists_isEmpty"></block>
        <block type="lists_getIndex"></block>
        <block type="lists_setIndex"></block>
        <block type="lists_getSublist"></block>
        <block type="lists_sort"></block>
        <block type="lists_split"></block>
        <block type="lists_reverse"></block>
    </category>
    <category name="%{BKY_MSG_VARIABLES_CATEGORY}" colour="%{BKY_VARIABLES_HUE}" custom="VARIABLE"></category>
    <category name="%{BKY_MSG_FUNCTIONS_CATEGORY}" colour="%{BKY_FUNCTIONS_HUE}" custom="PROCEDURE"></category>
    <category name="%{BKY_MSG_SYNTHBLOCKLY_CATEGORY}" colour="%{BKY_SYNTHBLOCKLY_HUE}">

      <category name="%{BKY_MSG_INSTRUMENTS_CATEGORY}" colour="%{BKY_INSTRUMENTS_HUE}">
        <category name="%{BKY_MSG_INSTRUMENT_CONTROL_CATEGORY}" colour="%{BKY_INSTRUMENT_CONTROL_HUE}">
          <block type="sb_create_synth_instrument"></block>
          <block type="sb_create_harmonic_synth"></block>
          <block type="sb_create_additive_synth"></block>
          <block type="sb_select_current_instrument"></block>
          <block type="sb_set_adsr"></block>
          <block type="sb_define_chord"></block>
          <block type="sb_set_instrument_vibrato">
            <value name="DETUNE_VALUE">
              <shadow type="math_number">
                <field name="NUM">0</field>
              </shadow>
            </value>
          </block>
          <block type="sb_set_instrument_volume">
            <value name="VOLUME_VALUE">
              <shadow type="math_number">
                <field name="NUM">1</field>
              </shadow>
            </value>
          </block>
        </category>
        <category name="%{BKY_MSG_SYNTHESIZERS_CATEGORY}" colour="%{BKY_SYNTHESIZERS_HUE}">
          <block type="sb_play_note">
            <value name="NOTE">
              <shadow type="text">
                <field name="TEXT">C4</field>
              </shadow>
            </value>
            <value name="VELOCITY">
              <shadow type="math_number">
                <field name="NUM">1</field>
              </shadow>
            </value>
          </block>
          <block type="sb_play_note_and_wait">
            <value name="NOTE">
              <shadow type="text">
                <field name="TEXT">C4</field>
              </shadow>
            </value>
            <value name="VELOCITY">
              <shadow type="math_number">
                <field name="NUM">1</field>
              </shadow>
            </value>
          </block>
          <block type="sb_play_drum">
            <value name="VELOCITY">
              <shadow type="math_number">
                <field name="NUM">1</field>
              </shadow>
            </value>
          </block>
        </category>
        <category name="%{BKY_MSG_SAMPLERS_CATEGORY}" colour="%{BKY_SAMPLERS_HUE}">
          <block type="jazzkit_play_drum">
            <value name="VELOCITY">
              <shadow type="math_number">
                <field name="NUM">1</field>
              </shadow>
            </value>
          </block>
        </category>
      </category>
      <category name="%{BKY_MSG_TRANSPORT_CATEGORY}" colour="%{BKY_TRANSPORT_HUE}">
        <block type="sb_transport_set_bpm"></block>
        <block type="sb_transport_start_stop"></block>
        <block type="sb_wait_musical"></block>
        <block type="sb_tone_loop"></block>
        <block type="sb_stop_all_blockly_loops"></block>
        <block type="sb_schedule_at_offset"></block>
      </category>
      <category name="%{BKY_MSG_EFFECTS_CATEGORY}" colour="%{BKY_EFFECTS_HUE}">
        <block type="sb_setup_effect"></block>
      </category>
      <category name="%{BKY_MSG_MIDI_CATEGORY}" colour="%{BKY_MIDI_HUE}">
        <block type="sb_midi_note_received"></block>
        <block type="sb_midi_play"></block>
        <block type="sb_map_midi_to_chord"></block>
      </category>
      <category name="%{BKY_MSG_PC_KEYBOARD_CATEGORY}" colour="%{BKY_PC_KEYBOARD_HUE}">
        <block type="sb_map_key_to_chord"></block>
        <block type="sb_toggle_pc_keyboard_midi"></block>
      </category>
      <category name="%{BKY_MSG_SERIAL_CATEGORY}" colour="%{BKY_SERIAL_HUE}">
        <block type="sb_serial_data_received"></block>
      </category>
    </category>
</xml>
`;
