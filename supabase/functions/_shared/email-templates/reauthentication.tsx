/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL = 'https://zbcoocxxxqcvgoefdunq.supabase.co/storage/v1/object/public/email-assets/logo-taskmates.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="TaskMates" style={logo} width="160" />
        <Heading style={h1}>Código de verificação 🔑</Heading>
        <Text style={text}>
          Use o código abaixo para confirmar sua identidade:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Este código expira em breve. Se você não solicitou este código, pode
          ignorar este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Nunito', 'Space Grotesk', Arial, sans-serif",
}
const container = {
  padding: '32px 28px',
  borderRadius: '24px',
  backgroundColor: '#ffffff',
  border: '1px solid #d0e5dc',
}
const logo = {
  margin: '0 0 24px',
  display: 'block',
}
const h1 = {
  fontFamily: "'Space Grotesk', 'Nunito', Arial, sans-serif",
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#102e26',
  margin: '0 0 20px',
  lineHeight: '1.25',
}
const text = {
  fontSize: '15px',
  color: '#527568',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeStyle = {
  fontFamily: "'Space Grotesk', 'Courier', monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#22a86c',
  letterSpacing: '4px',
  margin: '0 0 30px',
  padding: '16px 24px',
  backgroundColor: '#f4faf7',
  borderRadius: '16px',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: '#9ab5ab',
  margin: '32px 0 0',
  lineHeight: '1.5',
}
