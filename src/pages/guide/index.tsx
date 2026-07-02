import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { Button } from 'components/ui'
import { CurateIcon } from 'components/curate/icons'
import useDocumentHead from 'hooks/use-document-head'

const SKILL_PATH = '/skills/kleros-curate/SKILL.md'

const USER_PROMPT = `You are helping me use Kleros Curate safely.

Load the kleros-curate skill first. Before any transaction, read live onchain values for deposits, arbitration cost, challenge period, MetaEvidence, item schema, and registry status.

Help me:
- Identify the registry flavor: Light Curate, Stake Curate, Classic, or Scout.
- Fetch the current MetaEvidence and policy.
- Build valid item JSON without changing the schema columns.
- Compute the exact transaction value or token approval needed.
- Explain the challenge, removal, evidence, and appeal risks before I sign.`

type GuideMode = 'human' | 'agent'

const Page = styled.main`
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px var(--horizontal-padding) 70px;
  color: var(--curate-text);
`

const Surface = styled.section`
  overflow: hidden;
  border: 1px solid var(--curate-border);
  border-radius: var(--curate-radius);
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0.02)
    ),
    rgba(7, 11, 18, 0.9);
  box-shadow: var(--curate-shadow);
`

const Hero = styled(Surface)`
  min-height: 240px;
  padding: clamp(24px, 4vw, 46px);
  background:
    radial-gradient(
      circle at 84% 18%,
      rgba(0, 209, 255, 0.14),
      transparent 30%
    ),
    linear-gradient(135deg, rgba(6, 9, 15, 0.99), rgba(9, 18, 28, 0.94)),
    #06090f;
`

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid rgba(0, 209, 255, 0.26);
  border-radius: 999px;
  color: var(--curate-live);
  background: rgba(0, 209, 255, 0.08);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  max-width: 850px;
  margin: 18px 0 12px;
  color: var(--curate-text);
  font-size: clamp(38px, 5vw, 68px);
  line-height: 0.96;
  font-weight: 950;
`

const Copy = styled.p`
  max-width: 760px;
  margin: 0;
  color: var(--curate-muted);
  font-size: 16px;
  line-height: 1.65;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
`

const Tabs = styled.div`
  display: inline-flex;
  gap: 6px;
  margin: 24px 0 14px;
  padding: 5px;
  border: 1px solid var(--curate-border);
  border-radius: 14px;
  background: rgba(1, 4, 9, 0.56);
`

const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid
    ${({ $active }) =>
      $active ? 'rgba(0, 209, 255, 0.34)' : 'rgba(255, 255, 255, 0)'};
  border-radius: 10px;
  color: ${({ $active }) =>
    $active ? 'var(--curate-text)' : 'var(--curate-muted)'};
  background: ${({ $active }) =>
    $active ? 'rgba(0, 209, 255, 0.1)' : 'transparent'};
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
`

const CardTitle = styled.h2`
  margin: 14px 0 8px;
  color: var(--curate-text);
  font-size: 20px;
  font-weight: 950;
`

const Panel = styled(Surface)`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 0;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const PanelIntro = styled.div`
  padding: 22px;
`

const CodeBlock = styled.pre`
  min-height: 440px;
  max-height: 680px;
  margin: 0;
  padding: 18px;
  overflow: auto;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  color: #d9f7ff;
  background: rgba(1, 4, 9, 0.78);
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
`

const LinkLine = styled.a`
  display: inline-flex;
  margin-top: 14px;
  color: var(--curate-live);
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const Guide = () => {
  const [mode, setMode] = useState<GuideMode>('human')
  const [skillText, setSkillText] = useState('Loading kleros-curate skill...')
  const [copied, setCopied] = useState(false)

  useDocumentHead(
    'Guide & Skills | Kleros Curate',
    'Human and agent guide for using Kleros Curate registries, submissions, challenges, governance, MetaEvidence, and the kleros-curate skill.',
  )

  useEffect(() => {
    fetch(SKILL_PATH)
      .then((response) => response.text())
      .then(setSkillText)
      .catch(() =>
        setSkillText(
          'Could not load the local skill file. Open /skills/kleros-curate/SKILL.md directly.',
        ),
      )
  }, [])

  const visibleText = mode === 'agent' ? skillText : USER_PROMPT

  const copyText = async () => {
    await navigator.clipboard.writeText(visibleText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Page>
      <Hero>
        <div>
          <Eyebrow>
            <CurateIcon name="spark" size={15} />
            Guide & Skills
          </Eyebrow>
          <Title>Automate your Curate flow without guessing.</Title>
          <Copy>
            Copy the prompt or load the full Curate skill for submissions,
            challenges, governance, and registry creation.
          </Copy>
          <ActionRow>
            <Button type="primary" as={Link as any} to="/">
              Explore registries
            </Button>
            <Button as={Link as any} to="/pro">
              Curate Pro
            </Button>
            <Button href={SKILL_PATH}>Open SKILL.md</Button>
          </ActionRow>
        </div>
      </Hero>

      <Tabs role="tablist" aria-label="Guide mode">
        <TabButton
          type="button"
          $active={mode === 'human'}
          onClick={() => setMode('human')}
        >
          Human quickstart
        </TabButton>
        <TabButton
          type="button"
          $active={mode === 'agent'}
          onClick={() => setMode('agent')}
        >
          Agent skill
        </TabButton>
      </Tabs>

      <Tabs aria-hidden="true" style={{ marginTop: 24 }}>
        <Button type="primary" onClick={copyText}>
          <CurateIcon name="copy" size={16} />
          {copied ? 'Copied' : mode === 'agent' ? 'Copy skill' : 'Copy prompt'}
        </Button>
      </Tabs>

      <Panel>
        <PanelIntro>
          <Eyebrow>
            <CurateIcon
              name={mode === 'agent' ? 'activity' : 'user'}
              size={15}
            />
            {mode === 'agent' ? 'Full skill' : 'Reusable prompt'}
          </Eyebrow>
          <CardTitle>
            {mode === 'agent'
              ? 'Load the kleros-curate skill.'
              : 'Paste this prompt after loading the skill.'}
          </CardTitle>
          <Copy>
            {mode === 'agent'
              ? 'This is the complete local skill file used by agents to understand Curate registry operations.'
              : 'This prompt is for ordinary users browsing, submitting, challenging, or governing any Curate registry.'}
          </Copy>
          <LinkLine href="/llms.txt">llms.txt</LinkLine>
        </PanelIntro>
        <CodeBlock>{visibleText}</CodeBlock>
      </Panel>
    </Page>
  )
}

export default Guide
