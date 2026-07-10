import React, { useContext } from 'react'
import styled from 'styled-components'
import { CurateIcon } from 'components/curate/icons'
import { V2Card } from './v2'
import { ThemeContext } from 'contexts/theme-context'
import HeroLightDesktop from 'assets/images/hero/hero-lightmode-desktop.svg'
import HeroDarkDesktop from 'assets/images/hero/hero-darkmode-desktop.svg'
import HeroLightMobile from 'assets/images/hero/hero-lightmode-mobile.svg'
import HeroDarkMobile from 'assets/images/hero/hero-darkmode-mobile.svg'

export type FactoryStepDescriptor = {
  title: string
  description: string
  subitems?: string[]
}

type StepStatus = 'complete' | 'active' | 'upcoming'

export const FactoryPageShell = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: clamp(24px, 2.4vw, 28px) clamp(24px, 3vw, 32px)
    clamp(76px, 7vw, 96px);
  background: var(--klerosUIComponentsLightBackground);
  color: var(--klerosUIComponentsPrimaryText);
  gap: 0;

  @media (max-width: 720px) {
    padding-inline: 16px;
  }
`

export const FactoryCreateLabel = styled.label`
  display: flex;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 clamp(25px, 5vw, 65px) 20px;
  color: var(--klerosUIComponentsSecondaryPurple);
  font-size: 14px;
  line-height: 18px;

  @media (max-width: 980px) {
    display: none;
  }
`

const FactoryHeroFrame = styled.div`
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  overflow: hidden;

  svg {
    display: block;
    width: 100%;
    height: auto;
  }
`

const FactoryHeroDesktop = styled.div`
  display: block;

  @media (max-width: 720px) {
    display: none;
  }
`

const FactoryHeroMobile = styled.div`
  display: none;

  @media (max-width: 720px) {
    display: block;
  }
`

export const FactoryHeroImage = () => {
  const themeContext = useContext(ThemeContext)
  const isDarkMode = themeContext?.isDarkMode ?? true
  const DesktopHero = isDarkMode ? HeroDarkDesktop : HeroLightDesktop
  const MobileHero = isDarkMode ? HeroDarkMobile : HeroLightMobile

  return (
    <FactoryHeroFrame aria-hidden="true">
      <FactoryHeroDesktop>
        <DesktopHero />
      </FactoryHeroDesktop>
      <FactoryHeroMobile>
        <MobileHero />
      </FactoryHeroMobile>
    </FactoryHeroFrame>
  )
}

export const FactoryWizardGrid = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: start;
  min-height: 360px;
  width: 100%;

  > div:last-child {
    width: min(84vw, 700px);
    max-width: 100%;
  }

  @media (max-width: 980px) {
    display: block;
    min-height: 0;

    > div:last-child {
      width: 100%;
    }
  }
`

export const FactoryTimelineCard = styled(V2Card)`
  position: absolute;
  left: 2%;
  top: 0;
  display: flex;
  height: 360px;
  width: min(24vw, 260px);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;

  @media (max-width: 980px) {
    display: none;
  }
`

export const FactoryStepList = styled.ol`
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
`

export const FactoryStepItem = styled.li<{ $status: StepStatus }>`
  display: grid;
  position: relative;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 12px;
  min-height: 72px;
  padding: 0 0 18px;
  border: 0;
  background: transparent;

  &::after {
    content: '';
    position: absolute;
    top: 25px;
    left: 11px;
    width: 1px;
    height: calc(100% - 25px);
    background: var(--klerosUIComponentsStroke);
  }

  &:last-child::after {
    content: none;
  }
`

export const FactoryStepIndex = styled.span<{ $status: StepStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid
    ${({ $status }) =>
      $status === 'upcoming' ? 'var(--v2-stroke)' : 'rgba(72, 185, 255, 0.5)'};
  background: ${({ $status }) =>
    $status === 'complete'
      ? 'var(--v2-blue)'
      : $status === 'active'
        ? 'rgba(72, 185, 255, 0.16)'
        : 'transparent'};
  color: ${({ $status }) =>
    $status === 'complete'
      ? 'var(--klerosUIComponentsWhiteBackground)'
      : 'var(--klerosUIComponentsPrimaryText)'};
  font-size: 12px;
  font-weight: 600;
`

export const FactoryStepContent = styled.div`
  min-width: 0;

  strong {
    display: block;
    color: var(--klerosUIComponentsPrimaryText);
    font-size: 14px;
    line-height: 18px;
    font-weight: 600;
  }

  p {
    margin: 4px 0 0;
    color: var(--klerosUIComponentsSecondaryText);
    font-size: 12px;
    line-height: 18px;
  }

  small {
    display: block;
    margin-top: 4px;
    color: var(--klerosUIComponentsSecondaryText);
    font-size: 12px;
    line-height: 16px;
  }
`

export const FactoryWorkArea = styled(V2Card)`
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;

  > .ui-card,
  .ui-card {
    border: 1px solid var(--klerosUIComponentsStroke);
    border-radius: 3px;
    background: var(--klerosUIComponentsWhiteBackground);
    box-shadow: var(--v2-shadow);
  }

  .ui-card-head {
    min-height: auto;
    padding: 18px 24px;
    background: var(--klerosUIComponentsWhiteBackground);
    border-bottom: 1px solid var(--klerosUIComponentsStroke);
  }

  .ui-card-head-title {
    color: var(--klerosUIComponentsPrimaryText);
    font-size: 20px;
    line-height: 28px;
    font-weight: 600;
    text-align: center;
  }

  .ui-card-body {
    padding: clamp(24px, 3vw, 32px);
  }

  form {
    color: var(--klerosUIComponentsPrimaryText);
  }
`

export const FactoryActions = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: clamp(24px, 4vw, 32px);
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
`

export const FactoryActionGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`

export const FactoryDeploymentsCard = styled(V2Card)`
  margin-top: 26px;
  padding: 22px;
  border-radius: 12px;
`

export const FactoryDeploymentsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;

  h2 {
    margin: 0;
    color: var(--v2-text);
    font-size: 20px;
    font-weight: 800;
  }

  span {
    color: var(--v2-muted);
    font-size: 13px;
  }
`

export const FactoryDeploymentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
`

export const FactoryStepTimeline = ({
  currentStep,
  steps,
}: {
  currentStep: number
  steps: FactoryStepDescriptor[]
}) => (
  <FactoryTimelineCard>
    <FactoryStepList>
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const status =
          stepNumber < currentStep
            ? 'complete'
            : stepNumber === currentStep
              ? 'active'
              : 'upcoming'

        return (
          <FactoryStepItem $status={status} key={step.title}>
            <FactoryStepIndex $status={status}>
              {status === 'complete' ? (
                <CurateIcon name="verified" size={18} />
              ) : (
                stepNumber
              )}
            </FactoryStepIndex>
            <FactoryStepContent>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
              {step.subitems?.map((subitem) => (
                <small key={subitem}>{subitem}</small>
              ))}
            </FactoryStepContent>
          </FactoryStepItem>
        )
      })}
    </FactoryStepList>
  </FactoryTimelineCard>
)
