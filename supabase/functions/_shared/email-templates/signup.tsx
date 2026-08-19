/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Link, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, button, h1, link, text, normalizeLang } from './brand.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  lang?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  lang,
}: SignupEmailProps) => {
  const l = normalizeLang(lang)
  const pt = l === 'pt'
  return (
    <EmailLayout
      lang={l}
      siteName={siteName}
      preview={pt ? `Confirme seu e-mail no ${siteName}` : `Confirm your email on ${siteName}`}
      footer={
        pt
          ? 'Se você não criou esta conta, pode ignorar este e-mail com segurança.'
          : "If you didn't create this account, you can safely ignore this email."
      }
    >
      <Heading style={h1}>
        {pt ? 'Bem-vindo à regeneração! 🌱' : 'Welcome to regeneration! 🌱'}
      </Heading>
      <Text style={text}>
        {pt ? 'Obrigado por se cadastrar no ' : 'Thanks for signing up for '}
        <Link href={siteUrl} style={link}>
          <strong>{siteName}</strong>
        </Link>
        {pt ? '. Estamos felizes em ter você conosco.' : '. We are glad to have you with us.'}
      </Text>
      <Text style={text}>
        {pt ? 'Confirme seu endereço de e-mail (' : 'Confirm your email address ('}
        <Link href={`mailto:${recipient}`} style={link}>
          {recipient}
        </Link>
        {pt ? ') clicando no botão abaixo:' : ') by clicking the button below:'}
      </Text>
      <Button style={button} href={confirmationUrl}>
        {pt ? 'Verificar e-mail' : 'Verify email'}
      </Button>
    </EmailLayout>
  )
}

export default SignupEmail
