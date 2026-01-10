import { Instagram, Twitter, Linkedin, Github, Globe, Phone, MessageCircle, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialLinks } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface SocialLinksInputProps {
  socialLinks: SocialLinks;
  onChange: (links: SocialLinks) => void;
}

const socialFields = [
  { key: 'instagram', icon: Instagram, placeholder: '@username', label: 'Instagram' },
  { key: 'twitter', icon: Twitter, placeholder: '@username', label: 'Twitter/X' },
  { key: 'linkedin', icon: Linkedin, placeholder: 'username', label: 'LinkedIn' },
  { key: 'github', icon: Github, placeholder: 'username', label: 'GitHub' },
  { key: 'website', icon: Globe, placeholder: 'https://...', label: 'Website' },
] as const;

const contactFields = [
  { key: 'whatsapp', icon: Phone, placeholder: '+55 11 99999-9999', label: 'WhatsApp' },
  { key: 'telegram', icon: MessageCircle, placeholder: '@username', label: 'Telegram' },
  { key: 'signal', icon: Shield, placeholder: '+55 11 99999-9999', label: 'Signal' },
] as const;

export function SocialLinksInput({ socialLinks, onChange }: SocialLinksInputProps) {
  const { t } = useLanguage();

  const handleChange = (key: keyof SocialLinks, value: string) => {
    onChange({
      ...socialLinks,
      [key]: value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">{t('socialLinks')}</Label>
          <p className="text-sm text-muted-foreground">{t('socialLinksDescription')}</p>
        </div>
        
        <div className="grid gap-3">
          {socialFields.map(({ key, icon: Icon, placeholder, label }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <Input
                value={socialLinks[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                className="flex-1"
                aria-label={label}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">{t('contactMethods')}</Label>
          <p className="text-sm text-muted-foreground">{t('contactMethodsDescription')}</p>
        </div>
        
        <div className="grid gap-3">
          {contactFields.map(({ key, icon: Icon, placeholder, label }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <Input
                value={socialLinks[key as keyof SocialLinks] || ''}
                onChange={(e) => handleChange(key as keyof SocialLinks, e.target.value)}
                placeholder={placeholder}
                className="flex-1"
                aria-label={label}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
