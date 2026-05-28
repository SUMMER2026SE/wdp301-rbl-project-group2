import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Reset standard window and document scrolling
    window.scrollTo({ top: 0, left: 0 });
    document.documentElement.scrollTo({ top: 0, left: 0 });
    document.body.scrollTo({ top: 0, left: 0 });

    // Reset all custom scrollable layout containers
    const scrollableElements = document.querySelectorAll(
      ".overflow-y-auto, .overflow-auto, main, #root, body, html, .layout-content-container"
    );
    scrollableElements.forEach((el) => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
