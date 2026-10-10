/** Original gameplay classifications. These are not religious or biological claims. */
export const FAMILY_IDS = ['beast', 'nature', 'dragon', 'material', 'slime', 'demon', 'undead', 'extraordinary'] as const;
export type Family = typeof FAMILY_IDS[number];
export type FamilyDefinition = { label: string; teamStyle: 'pure' | 'mixed'; concept: string };
export const FAMILY_DEFINITIONS: Record<Family, FamilyDefinition> = {
  beast: { label: '獣系', teamStyle: 'pure', concept: '速さと連撃で先手を取る' },
  nature: { label: '自然系', teamStyle: 'pure', concept: '開幕の障壁から持久戦へつなぐ' },
  dragon: { label: '竜系', teamStyle: 'pure', concept: '仲間の攻撃で竜気を蓄え、息へ託す' },
  material: { label: '物質系', teamStyle: 'pure', concept: '重い構えから反攻する' },
  slime: { label: '粘体系', teamStyle: 'pure', concept: '柔軟な防御と資源管理で粘る' },
  demon: { label: '悪魔系', teamStyle: 'pure', concept: '敵の資源と強化を崩して攻める' },
  undead: { label: '不死系', teamStyle: 'pure', concept: '倒されても一度だけ立て直す' },
  extraordinary: { label: '超常系', teamStyle: 'mixed', concept: '異なる系統を束ねる自由編成の核' },
};

/** Only implemented roster families appear in selection UI; planned slots are not playable claims. */
export function activeFamilyOptions(roster: readonly { family?: Family }[]): readonly (readonly [Family | 'unassigned', string])[] {
  return [
    ...FAMILY_IDS.filter(id => roster.some(monster => monster.family === id)).map(id => [id, FAMILY_DEFINITIONS[id].label] as const),
    ...(roster.some(monster => !monster.family) ? [['unassigned', '系統未設定'] as const] : []),
  ];
}
