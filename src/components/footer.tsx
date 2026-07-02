import React from 'react'
import styled, { css } from 'styled-components'
import { smallScreenStyle } from 'styles/small-screen-style'
import { Link } from 'react-router-dom'
import icons from './social-icons'

const Container = styled.footer`
  width: 100%;
  background:
    linear-gradient(180deg, rgba(5, 7, 13, 0), rgba(5, 7, 13, 0.72)),
    ${({ theme }) => theme.footerBackground};
  border-top: 1px solid var(--curate-border);
  margin-top: auto;
`

const FooterInner = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--horizontal-padding);
  height: 64px;
  gap: 16px;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;

  ${smallScreenStyle(
    () => css`
      height: 114px;
      flex-direction: column;
      justify-content: center;
      padding-top: 8px;
      padding-bottom: 8px;
    `,
  )}
`

const StyledSecuredByKleros = styled.a`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: 0.1s;
  min-height: 24px;

  svg path {
    fill: ${({ theme }) => theme.white ?? '#ffffff'}BF;
    transition: 0.1s;
  }

  &:hover svg path {
    fill: ${({ theme }) => theme.white ?? '#ffffff'};
  }
`

const StyledSocialMedia = styled.div`
  display: flex;
  gap: 6px;
`

const FooterNav = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const FooterLink = styled(Link)`
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--curate-border);
  border-radius: 999px;
  color: var(--curate-text);
  background: rgba(255, 255, 255, 0.04);
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--curate-border-strong);
  }
`

const StyledSocialButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background-color: rgba(255, 255, 255, 0.04);
  padding: 8px;
  border: 1px solid var(--curate-border);
  border-radius: 12px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
  text-decoration: none;

  svg path {
    fill: ${({ theme }) => theme.white ?? '#ffffff'}BF;
    transition: 0.1s;
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: var(--curate-border-strong);

    svg path {
      fill: ${({ theme }) => theme.white ?? '#ffffff'};
    }
  }
`

const SOCIAL_NAV = [
  {
    icon: icons.telegram,
    href: 'https://t.me/KlerosCurate',
  },
  {
    icon: icons.x,
    href: 'https://x.com/KlerosCurate',
  },
  {
    icon: icons.discord,
    href: 'https://discord.com/invite/MhXQGCyHd9',
  },
  {
    icon: icons.youtube,
    href: 'https://youtube.com/@kleros_io',
  },
  {
    icon: icons.github,
    href: 'https://github.com/kleros/gtcr',
  },
  {
    icon: icons.linkedin,
    href: 'https://www.linkedin.com/company/kleros/',
  },
]

const Footer: React.FC = () => (
  <Container>
    <FooterInner>
      <StyledSecuredByKleros
        href="https://kleros.io"
        target="_blank"
        rel="noopener noreferrer"
      >
        {icons.securedByKleros}
      </StyledSecuredByKleros>
      <FooterNav>
        <FooterLink to="/guide">Guide & Skills</FooterLink>
        <FooterLink to="/pro">Curate Pro</FooterLink>
        <StyledSocialMedia>
          {SOCIAL_NAV.map((item, index) => (
            <StyledSocialButton
              key={index}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.icon}
            </StyledSocialButton>
          ))}
        </StyledSocialMedia>
      </FooterNav>
    </FooterInner>
  </Container>
)

export default Footer
