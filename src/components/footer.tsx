import React from 'react'
import styled, { css } from 'styled-components'
import { smallScreenStyle } from 'styles/small-screen-style'
import { Link } from 'react-router-dom'
import icons from './social-icons'

const Container = styled.footer`
  width: 100%;
  background: ${({ theme }) => theme.footerBackground};
  border-top: 0;
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
  border: 1px solid transparent;
  border-radius: 7px;
  color: rgba(255, 255, 255, 0.78);
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.14);
    border-color: transparent;
  }
`

const StyledSocialButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: transparent;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
  text-decoration: none;

  svg path {
    fill: ${({ theme }) => theme.white ?? '#ffffff'}BF;
    transition: 0.1s;
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.14);
    border-color: transparent;

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
