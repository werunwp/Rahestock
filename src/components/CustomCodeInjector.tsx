import { useEffect, useRef } from "react";
import { useCustomSettings } from "@/hooks/useCustomSettings";

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