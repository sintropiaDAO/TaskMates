/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, button, h1, text, normalizeLang } from './brand.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  lang?: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl, lang }: RecoveryEmailProps) => {
  const l = normalizeLang(lang)
  const pt = l === 'pt'
  return (
    <EmailLayout
      lang={l}
      siteName={siteName}
      preview={pt ? `Redefina sua senha no ${siteName}` : `Reset your password on ${siteName}`}
      footer={
        pt
          ? 'Se você não solicitou a redefinição, pode ignorar este e-mail. Sua senha não será alterada.'
          : "If you didn't request a reset, you can ignore this email. Your password won't change."
      }
    >
      <Heading style={h1}>{pt ? 'Redefinir sua senha 🔐' : 'Reset your password 🔐'}</Heading>
      <Text style={text}>
        {pt
          ? `Recebemos uma solicitação para redefinir sua senha no ${siteName}. Clique no botão abaixo para escolher uma nova senha.`
          : `We received a request to reset your password on ${siteName}. Click the button below to choose a new one.`}
      </Text>
      <Button style={button} href={confirmationUrl}>
        {pt ? 'Redefinir senha' : 'Reset password'}
      </Button>
    </EmailLayout>
  )
}

export default RecoveryEmail
