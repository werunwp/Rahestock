import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePicker } from "@/components/ImagePicker";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { toast } from "@/utils/toast";

export const BusinessTab = () => {
  const { businessSettings, updateBusinessSettings, isUpdating } = useBusinessSettings();
  
  const [formData, setFormData] = useState({
    business_name: "",
    logo_url: "",
    phone: "",
    whatsapp: "",
    email: "",
    facebook: "",
    address: "",
    invoice_prefix: "",
    invoice_footer_message: "",
    brand_color: "",
    primary_email: "",
    secondary_email: "",
    address_line1: "",
    address_line2: "",
    business_hours: "",
  });

  useEffect(() => {
    if (businessSettings) {
      setFormData({
        business_name: businessSettings.business_name || "",
        logo_url: businessSettings.logo_url || "",
        phone: businessSettings.phone || "",
        whatsapp: businessSettings.whatsapp || "",
        email: businessSettings.email || "",
        facebook: businessSettings.facebook || "",
        address: businessSettings.address || "",
        invoice_prefix: businessSettings.invoice_prefix || "INV",
        invoice_footer_message: businessSettings.invoice_footer_message || "",
        brand_color: businessSettings.brand_color || "#2c7be5",
        primary_email: businessSettings.primary_email || "",
        secondary_email: businessSettings.secondary_email || "",
        address_line1: businessSettings.address_line1 || "",
        address_line2: businessSettings.address_line2 || "",
        business_hours: businessSettings.business_hours || "",
      });
    }
  }, [businessSettings]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessSettings(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => handleInputChange("business_name", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="logo_url">Business Logo</Label>
                <ImagePicker
                  value={formData.logo_url}
                  onChange={(url) => handleInputChange("logo_url", url)}
                  onRemove={() => handleInputChange("logo_url", "")}
                />
              </div>

              <div>
                <Label htmlFor="brand_color">Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="brand_color"
                    type="color"
                    value={formData.brand_color}
                    onChange={(e) => handleInputChange("brand_color", e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.brand_color}
                    onChange={(e) => handleInputChange("brand_color", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="primary_email">Primary Email</Label>
                <Input
                  id="primary_email"
                  type="email"
                  value={formData.primary_email}
                  onChange={(e) => handleInputChange("primary_email", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="secondary_email">Secondary Email</Label>
                <Input
                  id="secondary_email"
                  type="email"
                  value={formData.secondary_email}
                  onChange={(e) => handleInputChange("secondary_email", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) => handleInputChange("address_line1", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) => handleInputChange("address_line2", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="business_hours">Business Hours</Label>
                <Input
                  id="business_hours"
                  value={formData.business_hours}
                  onChange={(e) => handleInputChange("business_hours", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.facebook}
                  onChange={(e) => handleInputChange("facebook", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                <Input
                  id="invoice_prefix"
                  value={formData.invoice_prefix}
                  onChange={(e) => handleInputChange("invoice_prefix", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="invoice_footer_message">Invoice Footer Message</Label>
                <Textarea
                  id="invoice_footer_message"
                  value={formData.invoice_footer_message}
                  onChange={(e) => handleInputChange("invoice_footer_message", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isUpdating} className="w-full">
            {isUpdating ? "Updating..." : "Update Business Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};