import React from 'react'
import styled from 'styled-components'
import { CurateIcon } from 'components/curate/icons'
import { Label, Small, StatusDot, Surface } from 'components/curate/primitives'
import {
  SECTIONS,
  sectionNumber,
  type GuideStep,
  type LegendItem,
  type OutcomeKind,
} from './content'
import { useJump } from './table-of-contents'

/*
 * The guide's reading pieces: section heads in display type, prose at a 68ch
 * measure, numbered steps on a rail, cost rows, asides, the status legend,
 * the outcome panel and definition grids. Separation comes from space and
 * hairlines; the only panels are the drawings and the outcome table.
 */

export const MEASURE = '68ch'

/** Read by screen readers, not drawn. */
export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

/* ---------- Section frame ---------- */

export const EyebrowRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  b {
    color: var(--color-primary);
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  i {
    width: 20px;
    height: 1px;
    background: var(--color-border-strong);
  }
`

export const Eyebrow = ({ id }: { id: string }) => (
  <EyebrowRow>
    <b>{sectionNumber(id)}</b>
    <i aria-hidden />
    <Label>{SECTIONS.find((section) => section.id === id)?.label}</Label>
  </EyebrowRow>
)

const Shell = styled.section`
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin-top: 104px;
  scroll-margin-top: calc(var(--app-bar-height) + 32px);

  @media (max-width: 1023px) {
    scroll-margin-top: calc(var(--app-bar-height) + 72px);
  }

  @media (max-width: 720px) {
    margin-top: 72px;
  }
`

const Head = styled.header`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 2px;
`

export const SectionTitle = styled.h2`
  margin: 0;
  max-width: 30ch;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(24px, 0.8vw + 18px, 30px);
  line-height: 1.12;
  font-weight: 500;
  letter-spacing: -0.03em;
  text-wrap: balance;
`

export const GuideSection = ({
  id,
  heading,
  children,
}: {
  id: string
  heading: string
  children: React.ReactNode
}) => (
  <Shell id={id} aria-labelledby={`${id}-title`}>
    <Head>
      <Eyebrow id={id} />
      <SectionTitle id={`${id}-title`}>{heading}</SectionTitle>
    </Head>
    {children}
  </Shell>
)

/* ---------- Text ---------- */

export const Prose = styled.p<{ $quiet?: boolean }>`
  margin: 0;
  max-width: ${MEASURE};
  color: var(--color-muted);
  font-size: ${({ $quiet }) => ($quiet ? '14px' : '16px')};
  line-height: ${({ $quiet }) => ($quiet ? '22px' : '28px')};
  text-wrap: pretty;

  strong {
    color: var(--color-text);
    font-weight: 500;
  }

  a {
    color: var(--color-primary);
  }

  @media (max-width: 720px) {
    font-size: ${({ $quiet }) => ($quiet ? '14px' : '15px')};
    line-height: ${({ $quiet }) => ($quiet ? '22px' : '26px')};
  }
`

const AsideBox = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: ${MEASURE};
  padding: 14px 18px 15px 20px;
  border-radius: var(--radius);
  background: var(--color-raised);
  box-shadow: inset 2px 0 0 var(--color-primary);

  p {
    margin: 0;
    color: var(--color-text);
    font-size: 15px;
    line-height: 24px;
    text-wrap: pretty;
  }
`

export const Aside = ({
  label = 'Keep in mind',
  children,
}: {
  label?: string
  children: React.ReactNode
}) => (
  <AsideBox role="note">
    <Label $tone="primary">{label}</Label>
    <p>{children}</p>
  </AsideBox>
)

/* ---------- Steps ---------- */

const StepRail = styled.ol`
  display: flex;
  flex-direction: column;
  max-width: ${MEASURE};
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
`

const StepItem = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 16px;
  padding-bottom: 22px;
  counter-increment: step;

  &::before {
    content: counter(step);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-pill);
    background: var(--color-raised);
    box-shadow: inset 0 1px 0 var(--glass-highlight);
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  &::after {
    content: '';
    position: absolute;
    top: 38px;
    bottom: 6px;
    left: 15.5px;
    width: 1px;
    background: var(--glass-border);
  }

  &:last-child {
    padding-bottom: 0;
  }

  &:last-child::after {
    display: none;
  }

  b {
    display: block;
    margin-top: 5px;
    color: var(--color-text);
    font-size: 15px;
    line-height: 22px;
    font-weight: 500;
  }

  p {
    margin: 4px 0 0;
    color: var(--color-muted);
    font-size: 15px;
    line-height: 24px;
    text-wrap: pretty;
  }
`

export const Steps = ({ steps }: { steps: GuideStep[] }) => (
  <StepRail>
    {steps.map((step) => (
      <StepItem key={step.title}>
        <div>
          <b>{step.title}</b>
          <p>{step.body}</p>
        </div>
      </StepItem>
    ))}
  </StepRail>
)

/* ---------- Costs ---------- */

const CostBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const CostRows = styled.dl`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 780px;
  margin: 0;

  > div {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    gap: 8px 16px;
    align-items: center;
    min-height: 56px;
    padding: 10px 18px;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius);
    background: var(--color-raised);
  }

  dt {
    color: var(--color-text);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    font-weight: 500;
  }

  dd {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 0;
  }

  @media (max-width: 720px) {
    > div {
      grid-template-columns: 1fr;
      padding: 12px 14px;
    }
  }
`

const Term = styled.span<{ $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: ${({ $muted }) =>
    $muted ? 'var(--color-muted)' : 'var(--color-text)'};
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const Plus = styled.span`
  color: var(--color-faint);
  font-size: 15px;
`

export const Costs = ({
  label,
  rows,
}: {
  label: string
  rows: { action: string; base: string }[]
}) => (
  <CostBlock>
    <Label $tone="faint">{label}</Label>
    <CostRows aria-label={label}>
      {rows.map((row) => (
        <div key={row.action}>
          <dt>{row.action}</dt>
          <dd>
            <Term>{row.base}</Term>
            <Plus aria-hidden>+</Plus>
            <VisuallyHidden> plus </VisuallyHidden>
            <Term $muted>arbitration cost</Term>
          </dd>
        </div>
      ))}
    </CostRows>
  </CostBlock>
)

/* ---------- Status legend ---------- */

const LegendGroup = styled.div`
  display: flex;
  flex-direction: column;

  & + & {
    margin-top: 28px;
  }
`

const LegendHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
`

const LegendRows = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    display: grid;
    grid-template-columns: minmax(360px, 42%) minmax(0, 1fr);
    gap: 4px 20px;
    align-items: center;
    min-height: 52px;
    padding: 10px 12px;
    margin: 0 -12px;
    border-radius: var(--radius);
    transition: background var(--motion);
  }

  /* The hairline sits inside the row's padding so the rounded hover fill
     does not bend it at the corners. */
  li::before {
    content: '';
    position: absolute;
    top: 0;
    right: 12px;
    left: 12px;
    height: 1px;
    background: var(--glass-border);
    transition: opacity var(--motion);
  }

  li:hover {
    background: var(--color-raised);
  }

  li:hover::before,
  li:hover + li::before {
    opacity: 0;
  }

  li > span:last-child {
    color: var(--color-muted);
    font-size: var(--fs-body);
    line-height: 22px;
  }

  @media (max-width: 720px) {
    li {
      grid-template-columns: 1fr;
      padding: 12px;
    }
  }
`

/* Set like the entry rows (components/curate/entry-status): dot, sans label,
   muted detail. Long details wrap under the label, not under the dot. */
const LegendStatus = styled.span`
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  column-gap: 8px;
  align-items: start;
  min-width: 0;

  > span:first-child {
    margin-top: calc((var(--lh-small) - 8px) / 2);
  }

  b {
    color: var(--color-text);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
    font-weight: 500;
  }

  i {
    color: var(--color-muted);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
    font-style: normal;
    font-variant-numeric: tabular-nums;
  }
`

export const StatusLegend = ({
  groups,
}: {
  groups: { group: string; items: LegendItem[] }[]
}) => (
  <div>
    {groups.map((group) => (
      <LegendGroup key={group.group}>
        <LegendHead>
          <Label $tone="text">{group.group}</Label>
          <Small $faint>{group.items.length} statuses</Small>
        </LegendHead>
        <LegendRows>
          {group.items.map((item) => (
            <li key={item.label}>
              <LegendStatus>
                <StatusDot $tone={item.tone} aria-hidden />
                <span>
                  <b>{item.label}</b>
                  {item.detail && <i> · {item.detail}</i>}
                </span>
              </LegendStatus>
              <span>{item.meaning}</span>
            </li>
          ))}
        </LegendRows>
      </LegendGroup>
    ))}
  </div>
)

/* ---------- Outcomes ---------- */

const OutcomePanel = styled(Surface)`
  overflow: hidden;
`

const OutcomeHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 20px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--glass-border);

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-muted);
    font-size: 12px;
  }

  @media (max-width: 720px) {
    padding: 16px;
  }
`

const OutcomeColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  > div {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 22px 24px 24px;
    border-left: 1px solid var(--glass-border);
  }

  > div:first-child {
    border-left: 0;
  }

  h3 {
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: 19px;
    line-height: 24px;
    font-weight: 500;
    letter-spacing: -0.02em;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
  }

  b {
    display: block;
    color: var(--color-text);
    font-size: var(--fs-body);
    line-height: 20px;
    font-weight: 500;
  }

  li span {
    display: block;
    margin-top: 2px;
    color: var(--color-muted);
    font-size: var(--fs-body);
    line-height: 21px;
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;

    > div {
      border-left: 0;
      border-top: 1px solid var(--glass-border);
    }

    > div:first-child {
      border-top: 0;
    }
  }

  @media (max-width: 720px) {
    > div {
      padding: 18px 16px 20px;
    }
  }
`

const MARK: Record<OutcomeKind, { glyph: string; tone: string; name: string }> =
  {
    gain: {
      glyph: '+',
      tone: 'var(--color-success)',
      name: 'More than you put in',
    },
    loss: {
      glyph: '−',
      tone: 'var(--color-danger)',
      name: 'Goes to the other side',
    },
    back: { glyph: '=', tone: 'var(--color-muted)', name: 'Returned' },
  }

const Mark = styled.i<{ $tone: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, ${({ $tone }) => $tone} 16%, transparent);
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, ${({ $tone }) => $tone} 30%, transparent);
  /* Pulled toward the text color so the glyph clears 4.5:1 on its tint. */
  color: color-mix(in srgb, ${({ $tone }) => $tone} 80%, var(--color-text));
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  line-height: 1;
`

export const OutcomeTable = ({
  title,
  roles,
}: {
  title: string
  roles: {
    role: string
    rows: { kind: OutcomeKind; when: string; result: string }[]
    footnote?: string
  }[]
}) => (
  <OutcomePanel $padding="none" aria-label={title}>
    <OutcomeHead>
      <Label $tone="faint">{title}</Label>
      <ul aria-label="Key">
        {(Object.keys(MARK) as OutcomeKind[]).map((kind) => (
          <li key={kind}>
            <Mark $tone={MARK[kind].tone} aria-hidden>
              {MARK[kind].glyph}
            </Mark>
            {MARK[kind].name}
          </li>
        ))}
      </ul>
    </OutcomeHead>
    <OutcomeColumns>
      {roles.map((role) => (
        <div key={role.role}>
          <h3>{role.role}</h3>
          <ul>
            {role.rows.map((row) => (
              <li key={row.when}>
                <Mark
                  $tone={MARK[row.kind].tone}
                  title={MARK[row.kind].name}
                  aria-hidden
                >
                  {MARK[row.kind].glyph}
                </Mark>
                <div>
                  <b>
                    <VisuallyHidden>{MARK[row.kind].name}: </VisuallyHidden>
                    {row.when}
                  </b>
                  <span>{row.result}</span>
                </div>
              </li>
            ))}
          </ul>
          {role.footnote && <Small $muted>{role.footnote}</Small>}
        </div>
      ))}
    </OutcomeColumns>
  </OutcomePanel>
)

/* ---------- Definitions ---------- */

export const Definitions = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 48px;
  margin: 0;

  > div {
    padding: 20px 0 24px;
    border-top: 1px solid var(--glass-border);
  }

  dt {
    margin-bottom: 6px;
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: 19px;
    line-height: 24px;
    font-weight: 500;
    letter-spacing: -0.02em;
  }

  dd {
    margin: 0;
    max-width: 52ch;
    color: var(--color-muted);
    font-size: 15px;
    line-height: 24px;
    text-wrap: pretty;
  }

  dd a {
    color: var(--color-primary);
    font-variant-numeric: tabular-nums;
    text-decoration: none;
  }

  dd a:hover {
    text-decoration: underline;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;

    > div {
      padding: 16px 0 18px;
    }
  }
`

export const DefinitionGrid = ({
  label,
  items,
}: {
  label?: string
  items: { term: string; definition: string; see?: string[] }[]
}) => {
  const jump = useJump()
  return (
    <div>
      {label && (
        <div style={{ marginBottom: 10 }}>
          <Label $tone="faint">{label}</Label>
        </div>
      )}
      <Definitions>
        {items.map((item) => (
          <div key={item.term}>
            <dt>{item.term}</dt>
            <dd>
              {item.definition}
              {item.see && (
                <>
                  {' '}
                  See{' '}
                  {item.see.map((id, index) => (
                    <React.Fragment key={id}>
                      {index > 0 && ', '}
                      <a
                        href={`#${id}`}
                        onClick={(event) => jump(event, id)}
                        aria-label={`Section ${sectionNumber(id)}: ${
                          SECTIONS.find((section) => section.id === id)?.label
                        }`}
                      >
                        {sectionNumber(id)}
                      </a>
                    </React.Fragment>
                  ))}
                  .
                </>
              )}
            </dd>
          </div>
        ))}
      </Definitions>
    </div>
  )
}

/* ---------- Links ---------- */

export const FileRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const FileRow = styled.a`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  min-height: 64px;
  padding: 12px 18px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  color: inherit;
  text-decoration: none;
  transition:
    border-color var(--motion),
    transform var(--motion),
    background var(--motion);

  strong {
    display: block;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 18px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  > svg {
    color: var(--color-faint);
    transition:
      color var(--motion),
      transform var(--motion);
  }

  &:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-1px);
  }

  &:hover strong,
  &:hover > svg {
    color: var(--color-primary);
  }

  &:hover > svg {
    transform: translate(1px, -1px);
  }
`

export const SourceGrid = styled.ul`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 32px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const SourceAnchor = styled.a`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  border-top: 1px solid var(--glass-border);
  color: var(--color-text);
  font-size: 15px;
  line-height: 22px;
  text-decoration: none;
  transition: color var(--motion);

  svg {
    flex: 0 0 auto;
    color: var(--color-faint);
    transition:
      color var(--motion),
      transform var(--motion);
  }

  &:hover {
    color: var(--color-primary);
  }

  &:hover svg {
    color: var(--color-primary);
    transform: translate(1px, -1px);
  }
`

export const External = ({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) => (
  <SourceAnchor href={href} target="_blank" rel="noreferrer">
    {children}
    <CurateIcon name="external" size={14} />
  </SourceAnchor>
)
