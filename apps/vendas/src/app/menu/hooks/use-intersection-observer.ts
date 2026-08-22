import { useEffect, useState } from "react";

export function useIntersectionObserver(
  categoryIds: string[],
  enabled: boolean,
) {
  const [activeId, setActiveId] = useState<string>(categoryIds[0] ?? "");

  useEffect(() => {
    if (!enabled || categoryIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;

        // Pick the topmost visible section to determine the active category
        const topmost = intersecting.reduce((prev, curr) =>
          curr.boundingClientRect.top < prev.boundingClientRect.top
            ? curr
            : prev,
        );
        setActiveId(topmost.target.id.replace("category-", ""));
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 },
    );

    categoryIds.forEach((id) => {
      const el = document.getElementById(`category-${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categoryIds, enabled]);

  return activeId;
}
