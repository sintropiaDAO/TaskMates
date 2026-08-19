/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

export type Lang = 'pt' | 'en'

export const normalizeLang = (value?: string | null): Lang =>
  String(value ?? '').toLowerCase().startsWith('pt') ? 'pt' : 'en'

export const LOGO_URL = 'https://taskmates.app/email-logo-taskmates.png'
export const CAPY_URL = 'https://taskmates.app/email-capyvera.png'

/** TaskMates brand palette */
export const brand = {
  green: '#1a9d6c',
  greenSoft: '#22a86c',
  ink: '#102e26',
  body: '#527568',
  muted: '#9ab5ab',
  border: '#d0e5dc',
  surface: '#ffffff',
  tint: '#f4faf7',
}

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Nunito', 'Space Grotesk', Arial, sans-serif",
  margin: 0,
  padding: '24px 12px',
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0',
  borderRadius: '24px',
  backgroundColor: brand.surface,
  border: `1px solid ${brand.border}`,
  overflow: 'hidden' as const,
}

export const header = {
  backgroundColor: brand.tint,
  padding: '28px 28px 20px',
  textAlign: 'center' as const,
}

export const content = { padding: '28px' }

export const logo = { margin: '0 auto 12px', display: 'block' }
export const capy = { margin: '0 auto', display: 'block' }

export const h1 = {
  fontFamily: "'Space Grotesk', 'Nunito', Arial, sans-serif",
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: brand.ink,
  margin: '0 0 18px',
  lineHeight: '1.25',
}

export const text = {
  fontSize: '15px',
  color: brand.body,
  lineHeight: '1.6',
  margin: '0 0 20px',
}

export const link = { color: brand.green, textDecoration: 'underline' }

export const button = {
  backgroundColor: brand.green,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '16px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const codeStyle = {
  fontFamily: "'Space Grotesk', 'Courier', monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: brand.green,
  letterSpacing: '4px',
  margin: '0 0 24px',
  padding: '16px 24px',
  backgroundColor: brand.tint,
  borderRadius: '16px',
  display: 'inline-block',
}

export const footerText = {
  fontSize: '12px',
  color: brand.muted,
  margin: '0',
  lineHeight: '1.5',
}

const hr = { borderColor: brand.border, margin: '28px 0 16px' }

interface LayoutProps {
  lang: Lang
  preview: string
  siteName: string
  children: React.ReactNode
  footer?: string
}

export const EmailLayout = ({
  lang,
  preview,
  siteName,
  children,
  footer,
}: LayoutProps) => (
  <Html lang={lang === 'pt' ? 'pt-BR' : 'en'} dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt={siteName} style={logo} width="150" />
          <Img src={CAPY_URL} alt="CapyVera" style={capy} width="96" />
        </Section>
        <Section style={content}>
          {children}
          <Hr style={hr} />
          <Text style={footerText}>{footer ?? ''}</Text>
          <Text style={footerText}>
            {lang === 'pt'
              ? 'Com carinho, CapyVera e a equipe TaskMates 🌱'
              : 'With care, CapyVera and the TaskMates team 🌱'}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)
