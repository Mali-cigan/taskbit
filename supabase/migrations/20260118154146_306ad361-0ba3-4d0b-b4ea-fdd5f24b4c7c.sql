-- Add DELETE policy for google_integrations table
CREATE POLICY "Users can delete their own integrations"
  ON public.google_integrations FOR DELETE
  USING (auth.uid() = user_id);