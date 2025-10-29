-- Fix invoice prefix to be dynamic from business_settings
-- Run this SQL in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    next_number INTEGER;
    invoice_num TEXT;
    prefix TEXT;
BEGIN
    -- Get the invoice prefix from business_settings
    SELECT COALESCE(invoice_prefix, '') INTO prefix
    FROM public.business_settings
    LIMIT 1;
    
    -- If prefix is empty, use empty string
    IF prefix IS NULL THEN
        prefix := '';
    END IF;
    
    -- Get the next number in sequence
    -- Look for all invoice numbers and extract the numeric part
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number ~ '^[A-Z]*[0-9]+$' 
            THEN CAST(REGEXP_REPLACE(invoice_number, '^[A-Z]*', '') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM public.sales;
    
    -- Format as PREFIX00001, PREFIX00002, etc. (5 digits)
    invoice_num := prefix || LPAD(next_number::TEXT, 5, '0');
    
    RETURN invoice_num;
END;
$function$;

