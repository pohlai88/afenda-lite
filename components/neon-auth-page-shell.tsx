import type { ReactNode } from "react";

type NeonAuthPageShellProps = {
  children: ReactNode;
  header?: ReactNode;
};

/**
 * Standard Neon Auth surface — semantic portal tokens only; AuthView owns the card chrome.
 */
export function NeonAuthPageShell({ children, header }: NeonAuthPageShellProps) {
  return (
    <main className="neon-auth-page">
      <a href="#neon-auth-view" className="portal-skip-link">
        Skip to sign in
      </a>

      <div className="neon-auth-page-inner">
        {header ? <div className="neon-auth-page-notices">{header}</div> : null}
        <div id="neon-auth-view" className="neon-auth-page-slot">
          {children}
        </div>
      </div>
    </main>
  );
}
