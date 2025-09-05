import React, { useEffect } from 'react';
import { useCustomSettings } from '@/hooks/useCustomSettings';

export const CustomCSSInjector: React.FC = () => {
  const { getCustomCSS } = useCustomSettings();
  const customCSS = getCustomCSS();

  useEffect(() => {
    if (!customCSS?.content || !customCSS?.is_enabled) {
      // Remove existing custom CSS if disabled or no content
      const existingStyle = document.getElementById('custom-css-injector');
      if (existingStyle) {
        existingStyle.remove();
      }
      return;
    }

    // Remove existing custom CSS
    const existingStyle = document.getElementById('custom-css-injector');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const styleElement = document.createElement('style');
    styleElement.id = 'custom-css-injector';
    styleElement.textContent = customCSS.content;

    // Inject into head
    document.head.appendChild(styleElement);

    // Cleanup on unmount
    return () => {
      const style = document.getElementById('custom-css-injector');
      if (style) {
        style.remove();
      }
    };
  }, [customCSS?.content, customCSS?.is_enabled]);

  // This component doesn't render anything visible
  return null;
};

