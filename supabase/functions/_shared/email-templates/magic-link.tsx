/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, button, h1, text, normalizeLang } from './brand.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  lang?: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl, lang }: MagicLinkEmailProps) => {
  const l = normalizeLang(lang)
  const pt = l === 'pt'
  return (
    <EmailLayout
      lang={l}
      siteName={siteName}
      preview={pt ? `Seu link de acesso para o ${siteName}` : `Your login link for ${siteName}`}
      footer={
        pt
          ? 'Se você não solicitou este link, pode ignorar este e-mail com segurança.'
          : "If you didn't request this link, you can safely ignore this email."
      }
    >
      <Heading style={h1}>{pt ? 'Seu link mágico ✨' : 'Your magic link ✨'}</Heading>
      <Text style={text}>
        {pt
          ? `Clique no botão abaixo para entrar no ${siteName}. Este link expira em breve por segurança.`
          : `Click the button below to sign in to ${siteName}. This link expires soon for your security.`}
      </Text>
      <Button style={button} href={confirmationUrl}>
        {pt ? `Entrar no ${siteName}` : `Sign in to ${siteName}`}
      </Button>
    </EmailLayout>
  )
}

export default MagicLinkEmail
