import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';

export default function AdminFix() {
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<string>('');

  const applyRLSFix = async () => {
    setIsApplying(true);
    setResult('Applying RLS policy fix...');
    
    try {
      // Execute the SQL migration
      const { data, error } = await supabase.rpc('exec', {
        sql: `
          -- Drop existing policies
          DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
          DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

          -- Create new policies
          CREATE POLICY "Users can insert their own role" 
          ON public.user_roles 
          FOR INSERT 
          TO authenticated
          WITH CHECK (user_id = auth.uid());

          CREATE POLICY "Users can view their own role" 
          ON public.user_roles 
          FOR SELECT 
          TO authenticated
          USING (user_id = auth.uid());

          CREATE POLICY "Admins can manage other user roles" 
          ON public.user_roles 
          FOR ALL
          TO authenticated
          USING (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id <> auth.uid())
          WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id <> auth.uid());

          CREATE POLICY "Admins can update their own role" 
          ON public.user_roles 
          FOR UPDATE
          TO authenticated
          USING (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id = auth.uid())
          WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id = auth.uid());
        `
      });
      
      if (error) {
        setResult(`Error: ${error.message}`);
        toast.error(`RLS fix failed: ${error.message}`);
      } else {
        setResult('✅ RLS policy fix applied successfully!');
        toast.success('RLS policy fix applied successfully!');
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
      toast.error(`RLS fix failed: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🔧 RLS Policy Fix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This will fix the "new row violates row-level security policy" error for the user_roles table.
          </p>
          
          <Button 
            onClick={applyRLSFix} 
            disabled={isApplying}
            className="w-full"
          >
            {isApplying ? 'Applying Fix...' : 'Apply RLS Fix'}
          </Button>
          
          {result && (
            <div className={`p-4 rounded-md ${
              result.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {result}
            </div>
          )}
          
          <div className="text-sm text-muted-foreground">
            <h4 className="font-semibold mb-2">What this fix does:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Allows users to insert their own role records</li>
              <li>Allows users to view their own role</li>
              <li>Allows admins to manage other user roles</li>
              <li>Allows admins to update their own role</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


