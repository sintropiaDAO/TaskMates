/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, codeStyle, h1, text, normalizeLang } from './brand.tsx'

interface ReauthenticationEmailProps {
  token: string
  siteName?: string
  lang?: string
}

export const ReauthenticationEmail = ({
  token,
  siteName = 'TaskMates',
  lang,
}: ReauthenticationEmailProps) => {
  const l = normalizeLang(lang)
  const pt = l === 'pt'
  return (
    <EmailLayout
      lang={l}
      siteName={siteName}
      preview={pt ? 'Seu código de verificação' : 'Your verification code'}
      footer={
        pt
          ? 'Este código expira em breve. Se você não solicitou este código, pode ignorar este e-mail.'
          : "This code expires soon. If you didn't request it, you can ignore this email."
      }
    >
      <Heading style={h1}>{pt ? 'Código de verificação 🔑' : 'Verification code 🔑'}</Heading>
      <Text style={text}>
        {pt
          ? 'Use o código abaixo para confirmar sua identidade:'
          : 'Use the code below to confirm your identity:'}
      </Text>
      <Text style={codeStyle}>{token}</Text>
    </EmailLayout>
  )
}

export default ReauthenticationEmail
