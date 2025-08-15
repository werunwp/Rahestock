import { useEffect } from "react";
import { useCustomSettings } from "@/hooks/useCustomSettings";

export const CustomCodeInjector = () => {
  const { getCustomCSS, getHeadSnippet, getBodySnippet } = useCustomSettings();

  useEffect(() => {
    const customCSS = getCustomCSS();
    const headSnippet = getHeadSnippet();
    const bodySnippet = getBodySnippet();

    // Inject custom CSS
    let styleElement: HTMLStyleElement | null = null;
    if (customCSS?.is_enabled && customCSS.content) {
      styleElement = document.createElement('style');
      styleElement.id = 'custom-css-injection';
      styleElement.textContent = customCSS.content;
      document.head.appendChild(styleElement);
    }

    // Inject head snippet
    let headElement: HTMLDivElement | null = null;
    if (headSnippet?.is_enabled && headSnippet.content) {
      // Sanitize content by removing dangerous patterns
      const sanitizedContent = sanitizeCode(headSnippet.content);
      headElement = document.createElement('div');
      headElement.id = 'custom-head-injection';
      headElement.innerHTML = sanitizedContent;
      document.head.appendChild(headElement);
    }

    // Inject body snippet
    let bodyElement: HTMLDivElement | null = null;
    if (bodySnippet?.is_enabled && bodySnippet.content) {
      // Sanitize content by removing dangerous patterns
      const sanitizedContent = sanitizeCode(bodySnippet.content);
      bodyElement = document.createElement('div');
      bodyElement.id = 'custom-body-injection';
      bodyElement.innerHTML = sanitizedContent;
      document.body.appendChild(bodyElement);
    }

    // Cleanup function
    return () => {
      if (styleElement) {
        styleElement.remove();
      }
      if (headElement) {
        headElement.remove();
      }
      if (bodyElement) {
        bodyElement.remove();
      }
    };
  }, [getCustomCSS, getHeadSnippet, getBodySnippet]);

  return null;
};

// Basic sanitization function to remove obviously dangerous patterns
function sanitizeCode(code: string): string {
  return code
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove eval() calls
    .replace(/eval\s*\(/gi, '')
    // Remove on* event handlers in HTML
    .replace(/\son\w+\s*=/gi, '');
}