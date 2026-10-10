import { describe, expect, it } from 'vitest';
import { activeFamilyOptions, FAMILY_DEFINITIONS, FAMILY_IDS } from './families';

describe('bounded gameplay family catalogue', () => {
  it('has seven pure-team goals and one mixed-team special goal', () => {
    expect(new Set(FAMILY_IDS).size).toBe(8);
    expect(FAMILY_IDS.filter(id => FAMILY_DEFINITIONS[id].teamStyle === 'pure')).toHaveLength(7);
    expect(FAMILY_DEFINITIONS.extraordinary.teamStyle).toBe('mixed');
    expect(FAMILY_IDS.every(id => FAMILY_DEFINITIONS[id].label && FAMILY_DEFINITIONS[id].concept)).toBe(true);
  });
  it('does not advertise unimplemented families as selectable roster options', () => {
    expect(activeFamilyOptions([{ family: 'beast' }, { family: 'dragon' }, {}])).toEqual([
      ['beast', '獣系'], ['dragon', '竜系'], ['unassigned', '系統未設定'],
    ]);
    expect(activeFamilyOptions([{ family: 'nature' }])).toEqual([['nature', '自然系']]);
  });
});
