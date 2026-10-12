# v0.20.10 公開後確認

確認終了: 2026-10-12 06:38:11 UTC。公開commit `6852230e96184577f5d30cfe8e840ac2824d8115` / tree `9b79a301732ad817a8dce598949acf78e9e8b7ce`。

[公開ゲーム](https://miyasakayosuke.github.io/kanshu-arena/) と [CI/Pages](https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38212222301) を確認。通常URL・再読込みの版/JS/CSSが一致。

- 2,680テスト / 127ファイル、15権利セルフテスト、TypeScript・build・ソース/配信物告知を通過。736対戦はsource.gitCommit/source.gameVersionを除きv0.20.9と一致。
- クラウドChromiumの実ウィンドウをリサイズ/ズームし400×606、320×433、802×394、500×379（200%ページズーム）、1000×758を確認。図鑑の最初の全身行とフッターが見え、横あふれなし。検索・条件・並び順・一覧位置・Back/Forward・詳細の固定閉じるボタンを確認。
- 8つの物語を実際に連続再生し、全3字幕と9秒の終了へ到達。停止/再開/最初から/最後へ/再生し直し、Tab循環と入れ子Escape、起動元へのfocus復帰を確認。1,305画像の観察記録はfps測定ではない。
- 戦闘から詳細/物語を開閉後の指示・開始・skip、3保存枠と元の編成を保持。ゲーム由来のconsole警告/エラー0件。265件は拡張機能URL由来。
- 実ゲームから開いたクレジットの展開告知6,791bytesのSHA-256は `7d95a4f4274dc1844bf31998a2ae0f0814af7deb04503743f8aeb2ae1fbef99c`。単独テキストURLの以前のアクセス制限は再試行せず、ソース/配信物と展開HTMLを照合。

クラウドブラウザでは別タブ表示中もdocument.hidden=falseとなり、実ブラウザの背景停止条件は成立させられなかった。制御試験の合格とは分けて未確認とした。物理端末のtouch/safe-area、200%の文字のみ拡大、OS動作軽減、障害注入、screen reader、fps/GPU/memory性能は未測定。既存の大きなJS chunk注意が残る。機械/表示確認は専門家による法的確認ではない。
