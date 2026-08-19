/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Link, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, button, h1, link, text, normalizeLang } from './brand.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  lang?: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl, lang }: InviteEmailProps) => {
  const l = normalizeLang(lang)
  const pt = l === 'pt'
  return (
    <EmailLayout
      lang={l}
      siteName={siteName}
      preview={pt ? `Você foi convidado(a) para o ${siteName}` : `You've been invited to ${siteName}`}
      footer={
        pt
          ? 'Se você não esperava este convite, pode ignorar este e-mail.'
          : "If you weren't expecting this invitation, you can ignore this email."
      }
    >
      <Heading style={h1}>{pt ? 'Você foi convidado(a)! 🌿' : "You're invited! 🌿"}</Heading>
      <Text style={text}>
        {pt ? 'Você recebeu um convite para fazer parte do ' : 'You have been invited to join '}
        <Link href={siteUrl} style={link}>
          <strong>{siteName}</strong>
        </Link>
        {pt
          ? '. Clique no botão abaixo para aceitar e criar sua conta.'
          : '. Click the button below to accept and create your account.'}
      </Text>
      <Button style={button} href={confirmationUrl}>
        {pt ? 'Aceitar convite' : 'Accept invitation'}
      </Button>
    </EmailLayout>
  )
}

export default InviteEmail
