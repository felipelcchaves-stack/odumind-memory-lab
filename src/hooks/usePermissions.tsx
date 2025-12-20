import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type PermissionType = 
  | 'odu' 
  | 'rituais' 
  | 'changelog' 
  | 'tools' 
  | 'users' 
  | 'analytics' 
  | 'analytics_avancadas'
  | 'caminhos'
  | 'anuncios'
  | 'avaliacoes'
  | 'settings' 
  | 'restore';

interface Permissions {
  odu: boolean;
  rituais: boolean;
  changelog: boolean;
  tools: boolean;
  users: boolean;
  analytics: boolean;
  analytics_avancadas: boolean;
  caminhos: boolean;
  anuncios: boolean;
  avaliacoes: boolean;
  settings: boolean;
  restore: boolean;
}

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>({
    odu: false,
    rituais: false,
    changelog: false,
    tools: false,
    users: false,
    analytics: false,
    analytics_avancadas: false,
    caminhos: false,
    anuncios: false,
    avaliacoes: false,
    settings: false,
    restore: false,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, [user]);

  async function checkPermissions() {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if user is admin
      const { data: adminCheck } = await supabase
        .rpc('has_admin_role', { _user_id: user.id });

      setIsAdmin(!!adminCheck);

      // Admins have all permissions
      if (adminCheck) {
        setPermissions({
          odu: true,
          rituais: true,
          changelog: true,
          tools: true,
          users: true,
          analytics: true,
          analytics_avancadas: true,
          caminhos: true,
          anuncios: true,
          avaliacoes: true,
          settings: true,
          restore: true,
        });
        setLoading(false);
        return;
      }

      // Check individual permissions for colaboradores
      const { data: userPermissions } = await supabase
        .from('collaborator_permissions')
        .select('permission_type, can_access')
        .eq('user_id', user.id);

      if (userPermissions) {
        const permissionsMap: Permissions = {
          odu: false,
          rituais: false,
          changelog: false,
          tools: false,
          users: false,
          analytics: false,
          analytics_avancadas: false,
          caminhos: false,
          anuncios: false,
          avaliacoes: false,
          settings: false,
          restore: false,
        };

        userPermissions.forEach((perm) => {
          if (perm.permission_type in permissionsMap) {
            permissionsMap[perm.permission_type as PermissionType] = perm.can_access;
          }
        });

        setPermissions(permissionsMap);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setLoading(false);
    }
  }

  const hasPermission = (permission: PermissionType): boolean => {
    return isAdmin || permissions[permission];
  };

  return { permissions, loading, isAdmin, hasPermission, refetch: checkPermissions };
}
