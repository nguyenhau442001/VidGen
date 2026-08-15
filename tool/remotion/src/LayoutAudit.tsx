import { useEffect, useState } from "react";
import { continueRender, delayRender, useCurrentFrame } from "remotion";

const AUDIT_SELECTOR = "[data-layout-audit]";

export const LayoutAudit: React.FC = () => {
  const frame = useCurrentFrame();
  const enabled = process.env.REMOTION_LAYOUT_AUDIT === "1";
  const [handle] = useState(() => (enabled ? delayRender(`layout audit frame ${frame}`) : null));

  useEffect(() => {
    if (handle === null) return;

    const raf = requestAnimationFrame(() => {
      const violations = Array.from(document.querySelectorAll<HTMLElement>(AUDIT_SELECTOR))
        .map((element) => ({
          name: element.dataset.layoutAudit ?? element.tagName,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
        }))
        .filter(
          ({ clientWidth, scrollWidth, clientHeight, scrollHeight }) =>
            scrollWidth > clientWidth + 1 || scrollHeight > clientHeight + 1
        );

      if (violations.length > 0) {
        throw new Error(`Layout overflow at frame ${frame}: ${JSON.stringify(violations)}`);
      }
      continueRender(handle);
    });

    return () => cancelAnimationFrame(raf);
  }, [frame, handle]);

  return null;
};
