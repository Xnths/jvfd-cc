import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components'
import * as React from 'react'

interface NewPostNotificationProps {
    postTitle: string
    postExcerpt: string
    postSlug: string
    postDate: string
    unsubscribeUrl: string
}

const baseUrl = 'https://psicologojoaofernandes.com'

export function NewPostNotification({
    postTitle,
    postExcerpt,
    postSlug,
    postDate,
    unsubscribeUrl,
}: NewPostNotificationProps) {
    const articleUrl = `${baseUrl}/blog/${postSlug}`

    return (
        <Html lang="pt-BR">
            <Head />
            <Preview>Novo artigo: {postTitle}</Preview>
            <Body style={bodyStyle}>
                <Container style={containerStyle}>
                    {/* Header */}
                    <Section style={headerStyle}>
                        <Text style={brandStyle}>João Fernandes · CRP-12/16198 · Psicólogo</Text>
                    </Section>

                    {/* Body */}
                    <Section style={contentStyle}>
                        <Text style={labelStyle}>{postDate}</Text>
                        <Heading style={titleStyle}>{postTitle}</Heading>
                        <Text style={excerptStyle}>{postExcerpt}</Text>

                        <Button href={articleUrl} style={buttonStyle}>
                            Ler artigo →
                        </Button>
                    </Section>

                    <Hr style={dividerStyle} />

                    {/* Footer */}
                    <Section style={footerStyle}>
                        <Text style={footerTextStyle}>
                            Você recebeu este e-mail porque se inscreveu para receber novidades do blog de{' '}
                            <Link href={baseUrl} style={footerLinkStyle}>
                                João Fernandes, Psicólogo
                            </Link>
                            .
                        </Text>
                        <Text style={footerTextStyle}>
                            <Link href={unsubscribeUrl} style={unsubscribeLinkStyle}>
                                Cancelar inscrição
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

export default NewPostNotification

// ── Styles ──────────────────────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    margin: 0,
    padding: '40px 0',
}

const containerStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    margin: '0 auto',
    maxWidth: '560px',
    overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
    backgroundColor: '#0f172a',
    padding: '24px 40px',
}

const brandStyle: React.CSSProperties = {
    color: '#f8fafc',
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '0.05em',
    margin: 0,
    textTransform: 'uppercase',
}

const contentStyle: React.CSSProperties = {
    padding: '40px 40px 32px',
}

const labelStyle: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: '12px',
    margin: '0 0 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
}

const titleStyle: React.CSSProperties = {
    color: '#0f172a',
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '1.3',
    margin: '0 0 16px',
}

const excerptStyle: React.CSSProperties = {
    color: '#475569',
    fontSize: '16px',
    lineHeight: '1.6',
    margin: '0 0 32px',
}

const buttonStyle: React.CSSProperties = {
    backgroundColor: '#16a34a',
    borderRadius: '8px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: '600',
    padding: '12px 28px',
    textDecoration: 'none',
}

const dividerStyle: React.CSSProperties = {
    borderColor: '#e2e8f0',
    margin: '0 40px',
}

const footerStyle: React.CSSProperties = {
    padding: '24px 40px 32px',
}

const footerTextStyle: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: '12px',
    lineHeight: '1.6',
    margin: '0 0 8px',
}

const footerLinkStyle: React.CSSProperties = {
    color: '#64748b',
    textDecoration: 'underline',
}

const unsubscribeLinkStyle: React.CSSProperties = {
    color: '#94a3b8',
    textDecoration: 'underline',
}
