import { useEffect, useRef } from 'react';

export default function LeaveBattleDialog({ onCancel, onConfirm, finished }: { onCancel: () => void; onConfirm: () => void; finished: boolean }) {
  const dialog = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="overlay leaveOverlay" onClick={onCancel}>
    <div className="modal leaveModal" role="alertdialog" aria-modal="true" aria-label="対戦を中断しますか" aria-describedby="leave-description" ref={dialog} onClick={e => e.stopPropagation()} onKeyDown={e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
      if (e.key === 'Tab') {
        const buttons = dialog.current?.querySelectorAll('button');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }}>
      <h2>{finished ? '対戦結果を閉じますか？' : '対戦を中断しますか？'}</h2>
      <p id="leave-description">{finished ? '編成はそのままで移動します。' : 'この対戦の途中経過は残りません。編成はそのままです。'}</p>
      {!finished && <small>確認中も対戦の時間は進みます。</small>}
      <button className="secondary" ref={cancel} onClick={onCancel}>対戦を続ける</button>
      <button className="primary" onClick={onConfirm}>中断して移動</button>
    </div>
  </div>;
}
