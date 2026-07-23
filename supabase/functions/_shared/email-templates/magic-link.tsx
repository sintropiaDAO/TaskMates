/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL = 'https://zbcoocxxxqcvgoefdunq.supabase.co/storage/v1/object/public/email-assets/logo-taskmates.png'

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu link de acesso para o {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={siteName} style={logo} width="160" />
        <Heading style={h1}>Seu link mágico ✨</Heading>
        <Text style={text}>
          Clique no botão abaixo para entrar no <strong>{siteName}</strong>. Este
          link expira em breve por segurança.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Entrar no {siteName}
        </Button>
        <Text style={footer}>
          Se você não solicitou este link, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
const button = {
  backgroundColor: '#22a86c',
  color: '#f8fcfa',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '16px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: '#9ab5ab',
  margin: '32px 0 0',
  lineHeight: '1.5',
}
