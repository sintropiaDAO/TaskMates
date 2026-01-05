import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TagBadge } from '@/components/ui/tag-badge';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { Profile, Tag } from '@/types';

interface UserWithTags extends Profile {
  tags: Tag[];
  compatibility?: number;
  commonTags?: Tag[];
}

const UserSearch = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { getTranslatedName } = useTags();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'skills' | 'communities'>('all');
  const [users, setUsers] = useState<UserWithTags[]>([]);
  const [currentUserTags, setCurrentUserTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch current user's tags
  useEffect(() => {
    const fetchCurrentUserTags = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_tags')
        .select('tag:tags(*)')
        .eq('user_id', user.id);
      
      if (data) {
        const tags = data.map(ut => ut.tag).filter(Boolean) as Tag[];
        setCurrentUserTags(tags);
      }
    };

    fetchCurrentUserTags();
  }, [user]);

  // Fetch all users with their tags
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);

      // Fetch all profiles except current user
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id || '');

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Fetch all user_tags with their tags
      const userIds = profiles.map(p => p.id);
      const { data: userTags } = await supabase
        .from('user_tags')
        .select('user_id, tag:tags(*)')
        .in('user_id', userIds);

      // Group tags by user
      const tagsByUser: Record<string, Tag[]> = {};
      userTags?.forEach(ut => {
        if (!tagsByUser[ut.user_id]) {
          tagsByUser[ut.user_id] = [];
        }
        if (ut.tag) {
          tagsByUser[ut.user_id].push(ut.tag as Tag);
        }
      });

      // Combine profiles with tags
      const usersWithTags: UserWithTags[] = profiles.map(profile => ({
        ...profile,
        social_links: profile.social_links as Profile['social_links'],
        tags: tagsByUser[profile.id] || []
      }));

      setUsers(usersWithTags);
      setLoading(false);
    };

    fetchUsers();
  }, [user]);

  // Calculate compatibility and filter users
  const processedUsers = useMemo(() => {
    const currentUserTagIds = new Set(currentUserTags.map(t => t.id));

    return users.map(u => {
      // Find common tags
      const commonTags = u.tags.filter(t => currentUserTagIds.has(t.id));
      
      // Calculate compatibility percentage
      const totalUniqueTags = new Set([
        ...currentUserTags.map(t => t.id),
        ...u.tags.map(t => t.id)
      ]).size;
      
      const compatibility = totalUniqueTags > 0 
        ? Math.round((commonTags.length / totalUniqueTags) * 100)
        : 0;

      return {
        ...u,
        compatibility,
        commonTags
      };
    });
  }, [users, currentUserTags]);

  // Filter users based on search and category
  const filteredUsers = useMemo(() => {
    let result = processedUsers;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => {
        const nameMatch = u.full_name?.toLowerCase().includes(query);
        const locationMatch = u.location?.toLowerCase().includes(query);
        const tagMatch = u.tags.some(t => t.name.toLowerCase().includes(query));
        return nameMatch || locationMatch || tagMatch;
      });
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(u => 
        u.tags.some(t => t.category === selectedCategory)
      );
    }

    // Always sort by compatibility
    result = [...result].sort((a, b) => (b.compatibility || 0) - (a.compatibility || 0));

    return result;
  }, [processedUsers, searchQuery, selectedCategory]);

  // Get recommended users (top compatibility)
  const recommendedUsers = useMemo(() => {
    return processedUsers
      .filter(u => (u.compatibility || 0) > 0)
      .sort((a, b) => (b.compatibility || 0) - (a.compatibility || 0))
      .slice(0, 5);
  }, [processedUsers]);

  const getCompatibilityColor = (compatibility: number) => {
    if (compatibility >= 70) return 'bg-green-500';
    if (compatibility >= 40) return 'bg-yellow-500';
    if (compatibility >= 20) return 'bg-orange-500';
    return 'bg-muted';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse text-primary">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-display font-bold">{t('searchUsers')}</h1>
              <p className="text-muted-foreground">{t('searchUsersDescription')}</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="glass rounded-xl p-4 shadow-soft">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">{t('filterAll')}</TabsTrigger>
                  <TabsTrigger value="skills">{t('filterSkills')}</TabsTrigger>
                  <TabsTrigger value="communities">{t('filterCommunities')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Recommendations Section */}
          {currentUserTags.length > 0 && recommendedUsers.length > 0 && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-6 shadow-soft border border-primary/20"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">{t('recommendedForYou')}</h2>
              </div>
              
              <div className="grid gap-3">
                {recommendedUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => navigate(`/profile/${u.id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.full_name || t('user')}</p>
                      {u.commonTags && u.commonTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {u.commonTags.slice(0, 3).map(tag => (
                            <span key={tag.id} className="text-xs text-muted-foreground">
                              #{tag.name}
                            </span>
                          ))}
                          {u.commonTags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{u.commonTags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getCompatibilityColor(u.compatibility || 0)}`}>
                        {u.compatibility}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* All Users List */}
          <div className="glass rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">
                {searchQuery ? t('searchResults') : t('allUsers')}
                <span className="text-muted-foreground ml-2">({filteredUsers.length})</span>
              </h2>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>{t('noUsersFound')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(u => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => navigate(`/profile/${u.id}`)}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-lg">{u.full_name || t('user')}</p>
                        {u.location && (
                          <p className="text-sm text-muted-foreground">{u.location}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 flex-1">
                      {u.tags.slice(0, 4).map(tag => (
                        <TagBadge key={tag.id} name={tag.name} category={tag.category} displayName={getTranslatedName(tag)} />
                      ))}
                      {u.tags.length > 4 && (
                        <Badge variant="secondary">+{u.tags.length - 4}</Badge>
                      )}
                    </div>

                    {currentUserTags.length > 0 && (u.compatibility || 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold ${getCompatibilityColor(u.compatibility || 0)}`}>
                          {u.compatibility}%
                        </div>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {t('compatibility')}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UserSearch;