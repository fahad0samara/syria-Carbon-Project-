import type { ReactNode } from 'react';

interface PanelHeaderProps {
  title: string;
  action?: ReactNode;
}

export function PanelHeader({ title, action }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <div className="hud-title-bar">
        <span className="bracket-tl" aria-hidden="true" />
        <span className="bracket-br" aria-hidden="true" />
        <h2 className="font-display text-[13.5px] sm:text-[14.5px] font-semibold tracking-wide text-[#c8e4ff] leading-tight whitespace-nowrap">
          {title}
        </h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
