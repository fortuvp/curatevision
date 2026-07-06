import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { Button } from 'components/ui'
import { CurateIcon } from 'components/curate/icons'
import useDocumentHead from 'hooks/use-document-head'

type GuideMode = 'human' | 'agent'

const CONTEXT_URL = 'https://curate.kleros.io/llms-full.txt'
const SKILL_URL = 'https://curate.kleros.io/skills/kleros-curate/SKILL.md'

const Page = styled.main`
  width: 100%;
  min-height: calc(100vh - 130px);
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(28px, 5vw, 58px) var(--horizontal-padding) 62px;
  color: var(--curate-text);
`

const ToggleWrap = styled.div`
  display: flex;
  justify-content: center;
`

const ModeToggle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--curate-muted);
  font-size: 18px;
  font-weight: 500;
`

const ModeButton = styled.button<{ $active?: boolean }>`
  min-width: 104px;
  min-height: 54px;
  padding: 0 20px;
  border: 1px solid
    ${({ $active }) =>
      $active ? 'rgba(83, 190, 255, 0.92)' : 'rgba(255, 255, 255, 0.14)'};
  border-radius: 16px;
  color: ${({ $active }) =>
    $active ? 'var(--curate-text)' : 'var(--curate-muted)'};
  background: ${({ $active }) =>
    $active ? 'rgba(0, 163, 255, 0.14)' : 'rgba(0, 0, 0, 0.18)'};
  cursor: pointer;
  font-size: 18px;
  font-weight: 700;
  box-shadow: ${({ $active }) =>
    $active ? '0 0 36px rgba(0, 163, 255, 0.12)' : 'none'};

  &:hover {
    border-color: rgba(83, 190, 255, 0.72);
    color: var(--curate-text);
  }

  @media (max-width: 640px) {
    min-width: 92px;
    min-height: 48px;
    padding: 0 14px;
  }
`

const PromptPanel = styled.section`
  margin-top: clamp(30px, 5vw, 48px);
  padding: clamp(18px, 2.5vw, 30px);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.36);
  box-shadow: 0 26px 90px rgba(0, 0, 0, 0.42);
`

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  color: var(--curate-live);
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    monospace;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;

  span:last-child {
    color: var(--curate-muted);
    text-transform: none;
  }

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

const PromptLine = styled.div`
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  margin-top: 24px;
  padding: clamp(16px, 2.2vw, 24px);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);

  @media (max-width: 860px) {
    grid-template-columns: 24px minmax(0, 1fr);

    button {
      grid-column: 1 / -1;
      width: 100%;
    }
  }
`

const PromptPrefix = styled.div`
  color: var(--curate-live);
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    monospace;
  font-size: 24px;
  font-weight: 900;
`

const PromptText = styled.div`
  color: var(--curate-text);
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    monospace;
  font-size: clamp(15px, 1.45vw, 20px);
  font-weight: 700;
  line-height: 1.5;
`

const LinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;

  a {
    color: var(--curate-muted);
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
  }

  a:hover {
    color: var(--curate-live);
  }
`

const Guide = () => {
  const [mode, setMode] = useState<GuideMode>('agent')
  const [copied, setCopied] = useState(false)

  useDocumentHead(
    'Guide & Skills | Kleros Curate',
    'Agent-readable Kleros Curate instructions and skill entrypoints.',
  )

  const prompt = useMemo(
    () =>
      mode === 'agent'
        ? `Read ${CONTEXT_URL} and follow it before interacting with Kleros Curate.`
        : `Open ${CONTEXT_URL} before using Kleros Curate. It explains registries, submissions, challenges, policies, and governed lists.`,
    [mode],
  )

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <Page>
      <ToggleWrap>
        <ModeToggle>
          <span>I am:</span>
          <ModeButton
            type="button"
            $active={mode === 'human'}
            onClick={() => setMode('human')}
          >
            Human
          </ModeButton>
          <ModeButton
            type="button"
            $active={mode === 'agent'}
            onClick={() => setMode('agent')}
          >
            Agent
          </ModeButton>
        </ModeToggle>
      </ToggleWrap>

      <PromptPanel>
        <PanelHead>
          <span>
            {mode === 'agent' ? '① Paste this into your agent' : '① Start here'}
          </span>
          <span>
            {mode === 'agent'
              ? 'One line · works in any agent'
              : 'One link · current instructions'}
          </span>
        </PanelHead>
        <PromptLine>
          <PromptPrefix>&gt;</PromptPrefix>
          <PromptText>{prompt}</PromptText>
          <Button type="primary" size="large" onClick={copyPrompt}>
            <CurateIcon name="copy" size={17} />
            {copied ? 'Copied' : 'Copy prompt'}
          </Button>
        </PromptLine>
        <LinkRow>
          <a href="/llms-full.txt">llms-full.txt</a>
          <a href="/llms.txt">llms.txt</a>
          <a href="/curate-agent-context.md">agent context</a>
          <a href={SKILL_URL}>SKILL.md</a>
        </LinkRow>
      </PromptPanel>
    </Page>
  )
}

export default Guide
