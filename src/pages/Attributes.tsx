import { useState } from "react";
import { useAttributes, ReusableAttribute, CreateAttributeData, UpdateAttributeData } from "@/hooks/useAttributes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Tag, Hash, Palette, Ruler, Type } from "lucide-react";
import { toast } from "sonner";

const Attributes = () => {
  const { 
    attributes, 
    isLoading, 
    createAttribute, 
    updateAttribute, 
    deleteAttribute 
  } = useAttributes();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<ReusableAttribute | null>(null);
  const [formData, setFormData] = useState<CreateAttributeData>({
    name: '',
    display_name: '',
    type: 'select',
    options: [],
    is_required: false,
    sort_order: 0,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      type: 'select',
      options: [],
      is_required: false,
      sort_order: 0,
    });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.display_name) {
      toast.error('Name and Display Name are required');
      return;
    }

    if (!formData.options || formData.options.length === 0) {
      toast.error('Attributes must have at least one option');
      return;
    }

    try {
      await createAttribute.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating attribute:', error);
    }
  };

  const handleEdit = (attribute: ReusableAttribute) => {
    setEditingAttribute(attribute);
    setFormData({
      name: attribute.name,
      display_name: attribute.display_name,
      type: attribute.type,
      options: attribute.options || [],
      is_required: attribute.is_required,
      sort_order: attribute.sort_order,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingAttribute) return;

    if (!formData.name || !formData.display_name) {
      toast.error('Name and Display Name are required');
      return;
    }

    if (!formData.options || formData.options.length === 0) {
      toast.error('Attributes must have at least one option');
      return;
    }

    try {
      await updateAttribute.mutateAsync({
        id: editingAttribute.id,
        ...formData,
      });
      setIsEditDialogOpen(false);
      setEditingAttribute(null);
      resetForm();
    } catch (error) {
      console.error('Error updating attribute:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAttribute.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting attribute:', error);
    }
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }));
  };

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'select': return <Tag className="h-4 w-4" />;
      case 'number': return <Hash className="h-4 w-4" />;
      case 'color': return <Palette className="h-4 w-4" />;
      case 'size': return <Ruler className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-100 text-blue-800';
      case 'select': return 'bg-green-100 text-green-800';
      case 'number': return 'bg-purple-100 text-purple-800';
      case 'color': return 'bg-pink-100 text-pink-800';
      case 'size': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Attributes</h1>
            <p className="text-muted-foreground">Manage reusable product attributes</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attributes</h1>
          <p className="text-muted-foreground">Manage reusable product attributes</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Attribute
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Attribute</DialogTitle>
              <DialogDescription>
                Create a reusable attribute that can be used across products.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., size, color"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="e.g., Size, Color"
                  />
                </div>
              </div>
              

              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {formData.options?.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
                />
                <Label htmlFor="is_required">Required</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createAttribute.isPending}>
                {createAttribute.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {attributes.map((attribute) => (
          <Card key={attribute.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(attribute.type)}
                  <CardTitle className="text-lg">{attribute.display_name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(attribute)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Attribute</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{attribute.display_name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(attribute.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <CardDescription>
                <div className="flex items-center gap-2">
                  <Badge className={getTypeColor(attribute.type)}>
                    {attribute.type}
                  </Badge>
                  {attribute.is_required && (
                    <Badge variant="destructive">Required</Badge>
                  )}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  <strong>Name:</strong> {attribute.name}
                </div>
                {attribute.options && Array.isArray(attribute.options) && attribute.options.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Options:</strong> {attribute.options.join(', ')}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  <strong>Sort Order:</strong> {attribute.sort_order}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {attributes.length === 0 && (
        <div className="text-center py-12">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No attributes found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first reusable attribute to get started.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Attribute
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Attribute</DialogTitle>
            <DialogDescription>
              Update the attribute details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., size, color"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-display_name">Display Name *</Label>
                <Input
                  id="edit-display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="e.g., Size, Color"
                />
              </div>
            </div>
            

            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {formData.options?.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
              />
              <Label htmlFor="edit-is_required">Required</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sort_order">Sort Order</Label>
              <Input
                id="edit-sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateAttribute.isPending}>
              {updateAttribute.isPending ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attributes;
