import React, { useState, useEffect } from "react";
import { Code2, Palette, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCustomSettings } from "@/hooks/useCustomSettings";
import { useUserRole } from "@/hooks/useUserRole";

export const CustomCodeSettings = () => {
  const { isAdmin } = useUserRole();
  const { customSettings, updateCustomSetting, isUpdating, isLoading, error } = useCustomSettings();
  
  // Separate loading states for each button
  const [cssSaving, setCssSaving] = useState(false);
  const [headSaving, setHeadSaving] = useState(false);
  const [bodySaving, setBodySaving] = useState(false);
  
  const [customCSS, setCustomCSS] = useState({
    content: '',
    is_enabled: false
  });
  
  const [headSnippet, setHeadSnippet] = useState({
    content: '',
    is_enabled: false
  });
  
  const [bodySnippet, setBodySnippet] = useState({
    content: '',
    is_enabled: false
  });

  // Initialize and sync form state with database
  useEffect(() => {
    console.log('CustomCodeSettings: customSettings changed:', customSettings);
    
    if (customSettings && customSettings.length > 0) {
      const cssData = customSettings.find(s => s.setting_type === 'custom_css');
      const headData = customSettings.find(s => s.setting_type === 'head_snippet');
      const bodyData = customSettings.find(s => s.setting_type === 'body_snippet');

      console.log('Found settings:', { cssData, headData, bodyData });

      if (cssData) {
        setCustomCSS({
          content: cssData.content || '',
          is_enabled: cssData.is_enabled || false
        });
      }

      if (headData) {
        setHeadSnippet({
          content: headData.content || '',
          is_enabled: headData.is_enabled || false
        });
      }

      if (bodyData) {
        setBodySnippet({
          content: bodyData.content || '',
          is_enabled: bodyData.is_enabled || false
        });
      }
    }
  }, [customSettings]);

  const handleSaveCSS = async () => {
    console.log('Saving CSS:', customCSS);
    setCssSaving(true);
    try {
      await updateCustomSetting({
        setting_type: 'custom_css',
        content: customCSS.content,
        is_enabled: customCSS.is_enabled
      });
    } finally {
      setCssSaving(false);
    }
  };

  const handleSaveHeadSnippet = async () => {
    console.log('Saving head snippet:', headSnippet);
    setHeadSaving(true);
    try {
      await updateCustomSetting({
        setting_type: 'head_snippet',
        content: headSnippet.content,
        is_enabled: headSnippet.is_enabled
      });
    } finally {
      setHeadSaving(false);
    }
  };

  const handleSaveBodySnippet = async () => {
    console.log('Saving body snippet:', bodySnippet);
    setBodySaving(true);
    try {
      await updateCustomSetting({
        setting_type: 'body_snippet',
        content: bodySnippet.content,
        is_enabled: bodySnippet.is_enabled
      });
    } finally {
      setBodySaving(false);
    }
  };

  const handleToggleCSS = (checked: boolean) => {
    console.log('CSS toggle changed to:', checked);
    setCustomCSS(prev => ({ ...prev, is_enabled: checked }));
  };

  const handleToggleHead = (checked: boolean) => {
    console.log('Head toggle changed to:', checked);
    setHeadSnippet(prev => ({ ...prev, is_enabled: checked }));
  };

  const handleToggleBody = (checked: boolean) => {
    console.log('Body toggle changed to:', checked);
    setBodySnippet(prev => ({ ...prev, is_enabled: checked }));
  };

  const hasDangerousContent = (content: string) => {
    const dangerousPatterns = [
      /javascript:/gi,
      /eval\s*\(/gi,
      /document\.write/gi,
      /innerHTML\s*=/gi,
      /outerHTML\s*=/gi
    ];
    return dangerousPatterns.some(pattern => pattern.test(content));
  };

  if (!isAdmin) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Custom CSS & Code settings are only available to administrators.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Custom Settings...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading custom settings: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <Alert>
          <AlertDescription>
            <strong>Debug Info:</strong><br />
            Custom Settings Count: {customSettings.length}<br />
            CSS Enabled: {customCSS.is_enabled ? 'Yes' : 'No'}<br />
            Head Enabled: {headSnippet.is_enabled ? 'Yes' : 'No'}<br />
            Body Enabled: {bodySnippet.is_enabled ? 'Yes' : 'No'}
          </AlertDescription>
        </Alert>
      )}

      {/* Custom CSS Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Custom CSS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customCSS">CSS Code</Label>
            <Textarea
              id="customCSS"
              value={customCSS.content}
              onChange={(e) => setCustomCSS(prev => ({ ...prev, content: e.target.value }))}
              placeholder="/* Your custom CSS here */
.my-custom-class {
  color: #ff0000;
}

/* This will override app styles */
.custom-button {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
}"
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="enableCSS"
                checked={customCSS.is_enabled}
                onCheckedChange={handleToggleCSS}
              />
              <Label htmlFor="enableCSS">Enable Custom CSS</Label>
            </div>
            <Button onClick={handleSaveCSS} disabled={cssSaving}>
              {cssSaving ? 'Saving...' : 'Save CSS'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Code Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Custom Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(hasDangerousContent(headSnippet.content) || hasDangerousContent(bodySnippet.content)) && 
           (headSnippet.is_enabled || bodySnippet.is_enabled) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: Your code contains potentially dangerous patterns that may be automatically sanitized for security.
              </AlertDescription>
            </Alert>
          )}

          {/* Head Snippet */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="headSnippet">Head Snippet (HTML/JS)</Label>
              <p className="text-sm text-muted-foreground">
                Code injected into the &lt;head&gt; section. Good for analytics, meta tags, or scripts that need to load early.
              </p>
              <Textarea
                id="headSnippet"
                value={headSnippet.content}
                onChange={(e) => setHeadSnippet(prev => ({ ...prev, content: e.target.value }))}
                placeholder="<!-- Google Analytics -->
<script async src=&quot;https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID&quot;></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>

<!-- Custom Meta Tags -->
<meta name=&quot;author&quot; content=&quot;Your Name&quot;>
<meta name=&quot;description&quot; content=&quot;Your custom description&quot;>"
                className="min-h-[150px] font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableHead"
                  checked={headSnippet.is_enabled}
                  onCheckedChange={handleToggleHead}
                />
                <Label htmlFor="enableHead">Enable Head Snippet</Label>
              </div>
              <Button onClick={handleSaveHeadSnippet} disabled={headSaving}>
                {headSaving ? 'Saving...' : 'Save Head Snippet'}
              </Button>
            </div>
          </div>

          {/* Body Snippet */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bodySnippet">Body-end Snippet (HTML/JS)</Label>
              <p className="text-sm text-muted-foreground">
                Code injected before the closing &lt;/body&gt; tag. Good for chat widgets, tracking pixels, or scripts that should load after content.
              </p>
              <Textarea
                id="bodySnippet"
                value={bodySnippet.content}
                onChange={(e) => setBodySnippet(prev => ({ ...prev, content: e.target.value }))}
                placeholder="<!-- Chat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://widget.chatservice.com/widget.js';
    script.setAttribute('data-widget-id', 'YOUR_WIDGET_ID');
    document.body.appendChild(script);
  })();
</script>

<!-- Custom Footer Script -->
<script>
  console.log('Custom footer script loaded');
</script>"
                className="min-h-[150px] font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableBody"
                  checked={bodySnippet.is_enabled}
                  onCheckedChange={handleToggleBody}
                />
                <Label htmlFor="enableBody">Enable Body Snippet</Label>
              </div>
              <Button onClick={handleSaveBodySnippet} disabled={bodySaving}>
                {bodySaving ? 'Saving...' : 'Save Body Snippet'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};