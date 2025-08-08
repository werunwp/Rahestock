-- Create missing user_preferences for existing user
INSERT INTO public.user_preferences (user_id, email_notifications, low_stock_alerts, sales_reports, dark_mode, compact_view)
VALUES ('6d20d4bd-d201-4307-9907-2d65c99b417c', true, true, true, false, false)
ON CONFLICT (user_id) DO NOTHING;