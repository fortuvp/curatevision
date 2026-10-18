import React from 'react'
import styled from 'styled-components'
import { Modal } from 'components/ui'
import { CurateIcon } from 'components/curate/icons'
import { Body, Button, Label, Stack } from 'components/curate/primitives'

/*
 * Confirmation before leaving for an external site. Built on the ui Modal
 * (radius 10, overlay shadow); the address is set in mono so it can be read
 * before it is opened.
 */

const UrlBox = styled.code`
  display: block;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: var(--fs-data);
  line-height: var(--lh-data);
  overflow-wrap: anywhere;
`

const Checklist = styled.ul`
  margin: 0;
  padding-left: 20px;
  color: var(--color-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-body);

  li + li {
    margin-top: 4px;
  }
`

interface ExternalLinkWarningProps {
  visible: boolean
  url: string
  onConfirm: () => void
  onCancel: () => void
}

const ExternalLinkWarning = ({
  visible,
  url,
  onConfirm,
  onCancel,
}: ExternalLinkWarningProps) => (
  <Modal
    visible={visible}
    title="Leaving CurateVision"
    onCancel={onCancel}
    width={480}
    centered
    footer={
      <>
        <Button type="button" $variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" $variant="primary" onClick={onConfirm}>
          <CurateIcon name="external" size={16} />
          Open external site
        </Button>
      </>
    }
  >
    <Stack $gap={16}>
      <Body>
        This link opens a site outside CurateVision. Check the address before
        you continue.
      </Body>
      <UrlBox>{url}</UrlBox>
      <Stack $gap={8}>
        <Label>Before you continue</Label>
        <Checklist>
          <li>Check that the domain is the one you expect.</li>
          <li>Look for misspellings or unusual characters.</li>
          <li>Open it only if you trust the site.</li>
        </Checklist>
      </Stack>
    </Stack>
  </Modal>
)

export default ExternalLinkWarning
