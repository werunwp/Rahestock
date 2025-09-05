import { useEffect, useRef } from "react";
import { useCustomSettings } from "@/hooks/useCustomSettings";
import DOMPurify from 'dompurify';

export const CustomCodeInjector = () => {
  const { customSettings } = useCustomSettings();
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const headElementRef = useRef<HTMLDivElement | null>(null);
  const bodyElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const customCSS = customSettings.find(s => s.setting_type === 'custom_css');
    const headSnippet = customSettings.find(s => s.setting_type === 'head_snippet');
    const bodySnippet = customSettings.find(s => s.setting_type === 'body_snippet');

    // Clean up existing elements first
    if (styleElementRef.current) {
      styleElementRef.current.remove();
      styleElementRef.current = null;
    }
    if (headElementRef.current) {
      headElementRef.current.remove();
      headElementRef.current = null;
    }
    if (bodyElementRef.current) {
      bodyElementRef.current.remove();
      bodyElementRef.current = null;
    }

    // Inject custom CSS
    if (customCSS?.is_enabled && customCSS.content) {
      const styleElement = document.createElement('style');
      styleElement.id = 'custom-css-injection';
      styleElement.textContent = customCSS.content;
      document.head.appendChild(styleElement);
      styleElementRef.current = styleElement;
      console.log('Custom CSS injected:', customCSS.content);
    }

    // Inject head snippet
    if (headSnippet?.is_enabled && headSnippet.content) {
      // Sanitize content by removing dangerous patterns
      const sanitizedContent = sanitizeCode(headSnippet.content);
      const headElement = document.createElement('div');
      headElement.id = 'custom-head-injection';
      headElement.innerHTML = sanitizedContent;
      document.head.appendChild(headElement);
      headElementRef.current = headElement;
      console.log('Head snippet injected:', sanitizedContent);
    }

    // Inject body snippet
    if (bodySnippet?.is_enabled && bodySnippet.content) {
      // Sanitize content by removing dangerous patterns
      const sanitizedContent = sanitizeCode(bodySnippet.content);
      const bodyElement = document.createElement('div');
      bodyElement.id = 'custom-body-injection';
      bodyElement.innerHTML = sanitizedContent;
      document.body.appendChild(bodyElement);
      bodyElementRef.current = bodyElement;
      console.log('Body snippet injected:', sanitizedContent);
    }

    // Cleanup function
    return () => {
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = null;
      }
      if (headElementRef.current) {
        headElementRef.current.remove();
        headElementRef.current = null;
      }
      if (bodyElementRef.current) {
        bodyElementRef.current.remove();
        bodyElementRef.current = null;
      }
    };
  }, [customSettings]);

  return null;
};

// Enhanced sanitization function using DOMPurify for security
function sanitizeCode(code: string): string {
  return DOMPurify.sanitize(code, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class', 'id', 'style'],
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'button', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true
  });
}