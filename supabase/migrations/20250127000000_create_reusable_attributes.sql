-- Create reusable product attributes table
CREATE TABLE IF NOT EXISTS reusable_attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'text',
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_reusable_attributes_name ON reusable_attributes(name);
CREATE INDEX IF NOT EXISTS idx_reusable_attributes_type ON reusable_attributes(type);

-- Enable RLS
ALTER TABLE reusable_attributes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view reusable attributes" ON reusable_attributes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reusable attributes" ON reusable_attributes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update reusable attributes" ON reusable_attributes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete reusable attributes" ON reusable_attributes FOR DELETE USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reusable_attributes_updated_at 
    BEFORE UPDATE ON reusable_attributes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default attributes
INSERT INTO reusable_attributes (name, display_name, type, options, is_required, sort_order) VALUES
('size', 'Size', 'select', '["XS", "S", "M", "L", "XL", "XXL"]', false, 1),
('color', 'Color', 'select', '["Red", "Blue", "Green", "Yellow", "Black", "White", "Gray"]', false, 2),
('material', 'Material', 'text', null, false, 3),
('weight', 'Weight', 'number', null, false, 4),
('brand', 'Brand', 'text', null, false, 5);
