import React from 'react'
import styled from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames } from './kit-styles'

/*
 * Empty state, v2: a raised glass tile on a soft blue halo (no grid), then
 * one line of text and an optional action.
 */
const Wrapper = styled.div`
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 24px;
  color: var(--color-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  text-align: center;
`

const ImageWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  color: var(--color-faint);

  &::before {
    content: '';
    position: absolute;
    inset: -28px;
    z-index: -1;
    border-radius: var(--radius-pill);
    background: radial-gradient(
      closest-side,
      color-mix(in srgb, var(--color-primary) 18%, transparent),
      transparent
    );
    pointer-events: none;
  }
`

const IconBox = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  background: var(--color-raised);
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    0 12px 28px -14px var(--color-primary);
  color: var(--color-muted);
`

const DescriptionText = styled.div`
  max-width: 40ch;
  color: var(--color-muted);
`

const Extra = styled.div`
  margin-top: 12px;
`

interface EmptyProps {
  description?: React.ReactNode | false
  image?: React.ReactNode | string
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

interface EmptyComponent extends React.FC<EmptyProps> {
  PRESENTED_IMAGE_SIMPLE: string
}

const Empty: EmptyComponent = ({
  description = 'No data',
  image,
  children,
  style,
  className,
}) => {
  const isSimple = image === Empty.PRESENTED_IMAGE_SIMPLE
  const customImage = image && !isSimple && typeof image !== 'string'

  return (
    <Wrapper
      style={style}
      className={joinClassNames(
        'ui-empty',
        isSimple && 'ui-empty-simple',
        className,
      )}
    >
      <ImageWrapper className="ui-empty-image">
        {customImage ? (
          image
        ) : isSimple ? (
          <KitIcon name="inbox" size={20} />
        ) : (
          <IconBox>
            <KitIcon name="inbox" size={20} />
          </IconBox>
        )}
      </ImageWrapper>
      {description !== false && (
        <DescriptionText className="ui-empty-description">
          {description}
        </DescriptionText>
      )}
      {children && <Extra className="ui-empty-footer">{children}</Extra>}
    </Wrapper>
  )
}

Empty.PRESENTED_IMAGE_SIMPLE = 'simple'

export default Empty
