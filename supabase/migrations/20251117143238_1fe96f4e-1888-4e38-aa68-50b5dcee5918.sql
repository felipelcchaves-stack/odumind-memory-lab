-- Update handle_new_user function to extract and save nome from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_nome TEXT;
BEGIN
  -- Extract nome from user metadata
  user_nome := NEW.raw_user_meta_data->>'nome';
  
  -- Insert profile with nome from metadata
  INSERT INTO public.profiles (user_id, xp, streak, meta_diaria, nome)
  VALUES (
    NEW.id, 
    0, 
    0, 
    30,
    COALESCE(user_nome, 'Usuário')  -- Fallback to 'Usuário' if nome not provided
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;