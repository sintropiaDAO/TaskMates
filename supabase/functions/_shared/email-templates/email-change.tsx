/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Link, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, button, h1, link, text, normalizeLang } from './brand.tsx'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
  lang?: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
  lang,
}: EmailChangeEmailProps) => {
  const l = normalizeLang(lang)
  const pt = l === 'pt'
  return (
    <EmailLayout
      lang={l}
      siteName={siteName}
      preview={
        pt ? `Confirme a alteração de e-mail no ${siteName}` : `Confirm your new email on ${siteName}`
      }
      footer={
        pt
          ? 'Se você não solicitou esta alteração, proteja sua conta imediatamente.'
          : "If you didn't request this change, secure your account immediately."
      }
    >
      <Heading style={h1}>{pt ? 'Alteração de e-mail ✉️' : 'Email change ✉️'}</Heading>
      <Text style={text}>
        {pt
          ? `Você solicitou alterar o e-mail da sua conta no ${siteName} de `
          : `You asked to change your ${siteName} account email from `}
        <Link href={`mailto:${oldEmail}`} style={link}>
          {oldEmail}
        </Link>
        {pt ? ' para ' : ' to '}
        <Link href={`mailto:${newEmail}`} style={link}>
          {newEmail}
        </Link>
        .
      </Text>
      <Text style={text}>
        {pt
          ? 'Clique no botão abaixo para confirmar esta alteração:'
          : 'Click the button below to confirm this change:'}
      </Text>
      <Button style={button} href={confirmationUrl}>
        {pt ? 'Confirmar alteração' : 'Confirm change'}
      </Button>
    </EmailLayout>
  )
}

export default EmailChangeEmail
