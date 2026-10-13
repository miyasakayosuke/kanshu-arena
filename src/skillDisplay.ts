/** Display-only redaction of explanatory potency, never mutate recorded combat data/results. */
export function displayBattleLogLine(line: string): string {
  return line
    .replace('毒1回あたり追加が14→22', '毒を消費した一撃がさらに強まる')
    .replace(/（残り0回・直接攻撃の基礎に\+(\d+)）/g, (_match, added: string) => Number(added) > 0 ? '（残り0回・一撃を強化）' : '（残り0回・追加なし）')
    .replace(/各最大HPの14%だけ一度回復/g, '最大HPに応じて傷を一度だけ修復');
}
