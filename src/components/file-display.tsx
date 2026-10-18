import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { getExtension } from 'mime'
import { parseIpfs } from 'utils/ipfs-parse'
import { useAttachment } from 'hooks/use-attachment'
import { buttonReset } from 'styles/button-reset'
import { CurateIcon } from 'components/curate/icons'
import { Small } from 'components/curate/primitives'

const ViewButton = styled.button`
  ${buttonReset}
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);

  &:hover {
    color: var(--color-primary-hover);
    text-decoration: underline;
  }
`

const ErrorText = styled.span`
  margin-left: 8px;
  color: var(--color-danger);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

interface FileDisplayProps {
  value?: string | null
  allowedFileTypes?: string | null
}

const FileDisplay = ({ value, allowedFileTypes }: FileDisplayProps) => {
  const [supported, setSupported] = useState(true)
  const openAttachment = useAttachment()

  useEffect(() => {
    const check = async () => {
      if (!value) return
      if (!allowedFileTypes) {
        setSupported(true)
        return
      }
      const allowed = allowedFileTypes.split(' ')
      let ext = ''
      if (value.includes('.')) ext = value.slice(value.lastIndexOf('.') + 1)
      else
        try {
          const res = await fetch(parseIpfs(value), { method: 'HEAD' })
          ext = getExtension(res.headers.get('content-type') || '') || ''
        } catch {
          setSupported(false)
          return
        }

      setSupported(allowed.includes(ext))
    }
    check()
  }, [value, allowedFileTypes])

  if (!value) return <Small $faint>No file</Small>

  return (
    <>
      <ViewButton
        type="button"
        onClick={() => openAttachment(parseIpfs(value))}
      >
        <CurateIcon name="policy" size={14} />
        View file
      </ViewButton>
      {!supported && <ErrorText>File type not supported</ErrorText>}
    </>
  )
}

export default FileDisplay
