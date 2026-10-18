import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { useFormik } from 'formik'
import { ItemTypes } from '@kleros/gtcr-encoder'
import useDocumentHead from 'hooks/use-document-head'
import ListingCriteriaLink from 'components/listing-criteria-link'
import { getArticleFor } from 'utils/string'
import { parseRichAddress } from 'utils/rich-address'
import {
  WhatHappensNext,
  type OutcomeStep,
  type ReceiptLine,
} from 'components/curate/what-happens-next'
import {
  Body,
  Button,
  ButtonLink,
  Data,
  KeyValueList,
  Label,
  Page,
  Row,
  Section,
  SkeletonBlock,
  Small,
  SplitGrid,
  Stack,
  Statement,
  Surface,
} from 'components/curate/primitives'
import { ColumnField } from './fields'
import { formatFileSize } from './amounts'
import {
  buildInitialValues,
  isEmptyField,
  isRequired,
  missingRequired,
  normaliseValues,
  validateSubmission,
  type FactoryChecks,
  type FieldValue,
  type SubmissionValues,
} from './form'
import type { GateFix } from './use-wallet-gate'
import type { SubmitHandler, SubmitPhase } from './use-submit-actions'

/*
 * Submission page (DESIGN.md): breadcrumb to the registry, the page's one
 * statement, then a split grid: the form on the left (one field per column),
 * on the right a read-only review of the entered values (the old Preview
 * stage) and "What happens next" with the exact receipt, the period, the
 * outcomes, the policy link and the confirm button that repeats the amount.
 * On phones the rail moves below the form and a confirm bar sticks to the
 * bottom, carrying the only confirm button at that width. Every number comes
 * from the registry's own data.
 */

export interface ConfirmGate {
  /** The wallet, chain, sign-in, balance or approval blocker, first one wins. */
  blocker?: string
  /** The action that clears `blocker`, shown as a secondary button. */
  fix?: GateFix
}

export interface SubmitPageProps {
  registryPath: string
  registryTitle?: string
  itemName: string
  /** The one-sentence summary; a skeleton until every word in it is known. */
  lede?: string
  columns?: Column[]
  initialValues?: unknown[]
  disabledFields?: boolean[]
  policyURI?: string | null
  receipt: ReceiptLine[]
  total: React.ReactNode
  steps: OutcomeStep[]
  /** Columns and deposit are known; until then the workspace is a skeleton. */
  ready: boolean
  gate: ConfirmGate
  phase: SubmitPhase
  submitting: boolean
  factoryChecks: FactoryChecks
  onSubmit: SubmitHandler
}

const Crumbs = styled.nav`
  margin-bottom: 20px;

  ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    color: var(--color-muted);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
  }

  li[aria-current] {
    color: var(--color-text);
    font-weight: 500;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    color: var(--color-primary);
    text-decoration: underline;
  }
`

const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M9 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const FormHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
`

const SideRail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`

/**
 * Holds the shared panel. On phones the sticky bar is the single confirm
 * button (DESIGN.md), so the panel's own button and its blocker line hide.
 */
const PanelSlot = styled.div`
  @media (max-width: 720px) {
    & > [role='group'] > button,
    & > [role='group'] > button ~ * {
      display: none;
    }
  }
`

/** Actions next to the panel; on phones the sticky bar carries them. */
const RailFix = styled(Button)`
  @media (max-width: 720px) {
    display: none;
  }
`

const RailCancel = styled(ButtonLink)`
  @media (max-width: 720px) {
    display: none;
  }
`

const ReviewValue = styled.span<{ $muted?: boolean }>`
  display: -webkit-box;
  overflow: hidden;
  color: ${({ $muted }) => ($muted ? 'var(--color-muted)' : 'inherit')};
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
`

const MONO_TYPES = new Set<string>([
  ItemTypes.ADDRESS,
  ItemTypes.GTCR_ADDRESS,
  ItemTypes.RICH_ADDRESS,
  ItemTypes.NUMBER,
  ItemTypes.TWITTER_USER_ID,
  ItemTypes.LINK,
])

/** What the submission will carry for one column, in words. */
const reviewText = (
  column: Column,
  value: FieldValue | undefined,
): { text: string; empty: boolean } => {
  if (column.type === ItemTypes.BOOLEAN)
    return { text: value === 'true' ? 'Yes' : 'No', empty: false }
  if (value instanceof File)
    return {
      text: `${value.name} · ${formatFileSize(value.size)}`,
      empty: false,
    }
  if (isEmptyField(column, value)) return { text: 'Not provided', empty: true }
  const text = String(value)
  if (column.type === ItemTypes.RICH_ADDRESS) {
    const parsed = parseRichAddress(text)
    if (parsed)
      return {
        text: `${parsed.reference.name} · ${parsed.address}`,
        empty: false,
      }
  }
  return { text, empty: false }
}

/** The old Preview stage as a live, read-only list beside the form. */
const Review = ({
  itemName,
  columns,
  values,
}: {
  itemName: string
  columns: Column[]
  values: SubmissionValues
}) => (
  <Surface $padding="compact" role="group" aria-label="Review">
    <Stack $gap={12}>
      <Label>Your {itemName}, as it will be submitted</Label>
      <KeyValueList>
        {columns.map((column) => {
          const { text, empty } = reviewText(column, values[column.label])
          return (
            <React.Fragment key={column.label}>
              <dt>{column.label}</dt>
              <dd>
                {MONO_TYPES.has(column.type) && !empty ? (
                  <Data title={text}>{text}</Data>
                ) : (
                  <ReviewValue $muted={empty} title={text}>
                    {text}
                  </ReviewValue>
                )}
              </dd>
            </React.Fragment>
          )
        })}
      </KeyValueList>
    </Stack>
  </Surface>
)

const PolicyLink = styled(ListingCriteriaLink)`
  color: var(--color-primary);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const StickyBar = styled.div`
  display: none;

  @media (max-width: 720px) {
    position: sticky;
    bottom: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 16px calc(-1 * var(--horizontal-padding)) -40px;
    padding: 12px var(--horizontal-padding)
      calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }
`

const phaseText = (phase: SubmitPhase, itemName: string): string =>
  phase === 'uploading'
    ? `Uploading your ${itemName} to IPFS…`
    : phase === 'wallet'
      ? 'Confirm in your wallet. The page waits until the transaction is mined.'
      : ''

const WorkspaceSkeleton = () => (
  <SplitGrid $rail={380} aria-busy>
    <Surface $padding="standard">
      <Stack $gap={20}>
        {[0, 1, 2].map((index) => (
          <Stack key={index} $gap={6}>
            <SkeletonBlock $height="20px" $width="32%" />
            <SkeletonBlock $height="40px" />
          </Stack>
        ))}
      </Stack>
    </Surface>
    <Surface $padding="compact">
      <Stack $gap={12}>
        <SkeletonBlock $height="16px" $width="44%" />
        <SkeletonBlock $height="72px" />
        <SkeletonBlock $height="120px" />
        <SkeletonBlock $height="40px" />
      </Stack>
    </Surface>
  </SplitGrid>
)

const Workspace = ({
  columns,
  initialValues,
  disabledFields,
  factoryChecks,
  onSubmit,
  gate,
  phase,
  submitting,
  receipt,
  total,
  steps,
  policyURI,
  itemName,
  confirmLabel,
  registryPath,
}: Omit<SubmitPageProps, 'columns' | 'ready' | 'lede'> & {
  columns: Column[]
  confirmLabel: string
}) => {
  const initial = useMemo(
    () => buildInitialValues(columns, initialValues),
    [columns, initialValues],
  )
  const formik = useFormik<SubmissionValues>({
    initialValues: initial,
    // Validation runs the list-creator subgraph checks for GTCR address
    // columns, so it waits for blur and submit instead of every keystroke.
    validateOnChange: false,
    validate: (values) => validateSubmission(columns, values, factoryChecks),
    onSubmit: (values, helpers) =>
      onSubmit(
        normaliseValues(columns, values),
        columns,
        helpers.resetForm,
        helpers.setFieldValue,
      ),
  })

  const missing = missingRequired(columns, formik.values)
  const highlighted = columns.some(
    (column) => formik.errors[column.label] && formik.touched[column.label],
  )
  const formBlocker =
    missing > 0
      ? `Fill in ${missing} required field${missing === 1 ? '' : 's'} to submit`
      : highlighted
        ? 'Fix the highlighted fields to submit'
        : ''
  const blocker = gate.blocker || formBlocker
  const status = phaseText(phase, itemName)

  const confirm = () => {
    formik.submitForm().catch((err) => {
      console.error('Error validating the submission:', err)
    })
  }

  const policy = policyURI ? (
    <>
      Your {itemName} must meet the{' '}
      <PolicyLink fileURI={policyURI}>listing policy</PolicyLink>; anything that
      does not can be challenged.
    </>
  ) : undefined

  return (
    <>
      <SplitGrid $rail={380}>
        <Surface $padding="standard">
          <form
            id="submit-item-form"
            noValidate
            aria-busy={submitting}
            onSubmit={formik.handleSubmit}
          >
            <Stack $gap={20}>
              <FormHeader>
                <Label>Item details</Label>
                {columns.some((column) => isRequired(column)) && (
                  <Small $muted>Fields marked * are required.</Small>
                )}
              </FormHeader>
              {columns.map((column, index) => (
                <ColumnField
                  key={column.label}
                  column={column}
                  value={formik.values[column.label]}
                  error={formik.errors[column.label]}
                  showError={!!formik.touched[column.label]}
                  disabled={submitting || !!disabledFields?.[index]}
                  onChange={(value) =>
                    formik.setFieldValue(column.label, value)
                  }
                  onBlur={() => formik.setFieldTouched(column.label, true)}
                />
              ))}
            </Stack>
          </form>
        </Surface>

        <SideRail>
          <Review itemName={itemName} columns={columns} values={formik.values} />
          <PanelSlot>
            <WhatHappensNext
              receipt={receipt}
              total={total}
              steps={steps}
              confirmLabel={confirmLabel}
              onConfirm={confirm}
              confirmDisabled={!!blocker}
              confirmBlocker={blocker || undefined}
              loading={submitting}
              policy={policy}
            />
          </PanelSlot>
          {gate.fix && gate.blocker && (
            <RailFix
              type="button"
              $variant="secondary"
              $block
              disabled={gate.fix.loading}
              onClick={gate.fix.onClick}
            >
              {gate.fix.loading ? 'Waiting…' : gate.fix.label}
            </RailFix>
          )}
          <RailCancel to={registryPath} $variant="ghost" $block>
            Cancel
          </RailCancel>
          {status && (
            <Small $muted role="status">
              {status}
            </Small>
          )}
        </SideRail>
      </SplitGrid>

      <StickyBar>
        <Row $justify="space-between" $align="center" $gap={12}>
          <ButtonLink to={registryPath} $variant="ghost" $size="sm">
            Cancel
          </ButtonLink>
          <Row $gap={8} $align="baseline">
            <Small $muted>You send now</Small>
            <Data $weight={600}>{total}</Data>
          </Row>
        </Row>
        {gate.fix && gate.blocker ? (
          <Button
            type="button"
            $variant="primary"
            $block
            disabled={gate.fix.loading}
            onClick={gate.fix.onClick}
          >
            {gate.fix.loading ? 'Waiting…' : gate.fix.label}
          </Button>
        ) : (
          <Button
            type="button"
            $variant="primary"
            $block
            disabled={!!blocker || submitting}
            aria-disabled={!!blocker || submitting}
            title={blocker || undefined}
            onClick={confirm}
          >
            {submitting ? (
              'Waiting for your wallet…'
            ) : (
              <>
                {confirmLabel} · {total}
              </>
            )}
          </Button>
        )}
        {status ? (
          <Small $muted role="status">
            {status}
          </Small>
        ) : (
          blocker && !gate.fix && <Small $muted>{blocker}</Small>
        )}
      </StickyBar>
    </>
  )
}

export const SubmitPage = (props: SubmitPageProps) => {
  const { registryPath, registryTitle, itemName, lede, ready, columns } = props
  const article = getArticleFor(itemName)
  const confirmLabel = `Submit ${article} ${itemName}`
  useDocumentHead(
    `Submit ${article} ${itemName} · ${registryTitle ?? 'Kleros Curate'}`,
  )

  return (
    <Page>
      <Crumbs aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/browse">Registries</Link>
          </li>
          <li>
            <Chevron />
            <Link to={registryPath}>{registryTitle ?? 'Registry'}</Link>
          </li>
          <li aria-current="page">
            <Chevron />
            Submit {article} {itemName}
          </li>
        </ol>
      </Crumbs>

      <Section $gap="sm">
        <Stack $gap={10}>
          {registryTitle ? (
            <Statement>
              Submit {article} {itemName} to {registryTitle}
            </Statement>
          ) : (
            <SkeletonBlock $height="44px" $width="min(100%, 520px)" />
          )}
          {lede ? (
            <Body $muted $large>
              {lede}
            </Body>
          ) : (
            <SkeletonBlock $height="24px" $width="min(100%, 640px)" />
          )}
        </Stack>
      </Section>

      <Section>
        {ready && columns ? (
          <Workspace {...props} columns={columns} confirmLabel={confirmLabel} />
        ) : (
          <WorkspaceSkeleton />
        )}
      </Section>
    </Page>
  )
}

export default SubmitPage
